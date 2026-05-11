// Analyze an uploaded medical lab report (PDF/image) or a manual entry.
// Uses Lovable AI (Gemini) to extract values, flag abnormalities, and
// produce a plain-language summary + comparison vs the user's previous reports.

// @ts-ignore - Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno ESM
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // @ts-ignore
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!LOVABLE_API_KEY) {
      return json({ error: "AI service not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const {
      mode, // 'file' | 'manual'
      fileBase64,
      mimeType,
      fileName,
      reportType,
      manualValues, // { bilirubin: '1.4 mg/dL', alt: '55 U/L', ... }
      reportDate,
    }: {
      mode: "file" | "manual";
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
      reportType?: string;
      manualValues?: Record<string, string>;
      reportDate?: string;
    } = body;

    if (!mode) return json({ error: "Missing mode" }, 400);

    // Pull last 5 medical reports for trend context
    const { data: history } = await supabase
      .from("medical_reports")
      .select("report_type, extracted_values, summary, report_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const historyText = history?.length
      ? history
          .map(
            (h: any, i: number) =>
              `${i + 1}. ${(h.report_date || h.created_at).slice(0, 10)} — ${h.report_type || "report"}: ${JSON.stringify(h.extracted_values).slice(0, 400)}`
          )
          .join("\n")
      : "No previous reports.";

    const systemPrompt = `You are SkinScope Health Intelligence, an educational AI assistant that interprets lab reports for users. You are NOT a medical device and must never give a clinical diagnosis. Use cautious language ("appears", "suggests", "consistent with"). Always recommend consulting a licensed healthcare professional for any abnormal finding. Always return valid JSON via the provided tool.`;

    const userPrompt =
      mode === "file"
        ? `Analyze this lab report (${reportType || "general"}). Extract every measurable parameter you can read.`
        : `Interpret these manually-entered lab values (${reportType || "general"}):\n${JSON.stringify(manualValues, null, 2)}`;

    const fullPrompt = `${userPrompt}

User's previous reports (most recent first):
${historyText}

Tasks:
1) Extract all measurable parameters with value, unit, and (if visible) reference range. Mark each as 'low', 'normal', 'high', or 'critical'.
2) Identify abnormalities and explain each in plain language.
3) Write a 2-4 sentence summary in simple English.
4) Compare to previous reports — note improving/worsening/stable trends per parameter when possible.
5) Suggest non-diagnostic next steps (hydration, diet, when to consult a clinician).`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      mode === "file" && fileBase64
        ? {
            role: "user",
            content: [
              { type: "text", text: fullPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
            ],
          }
        : { role: "user", content: fullPrompt },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "submit_report_analysis",
              description: "Return structured lab report analysis.",
              parameters: {
                type: "object",
                properties: {
                  extracted_values: {
                    type: "object",
                    description: "Map of parameter_name -> { value, unit, ref_range, flag }. flag is one of low|normal|high|critical|unknown.",
                  },
                  abnormalities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        value: { type: "string" },
                        severity: { type: "string", enum: ["mild", "moderate", "severe", "info"] },
                        note: { type: "string" },
                      },
                      required: ["name", "value", "severity", "note"],
                    },
                  },
                  summary: { type: "string" },
                  plain_language: { type: "string" },
                  comparison_note: { type: "string" },
                  trend: {
                    type: "string",
                    enum: ["improving", "stable", "worsening", "first_report", "inconclusive"],
                  },
                  recommendation: { type: "string" },
                },
                required: ["extracted_values", "abnormalities", "summary", "plain_language", "comparison_note", "trend", "recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_report_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded. Please try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return json({ error: "AI service error" }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "AI returned malformed response" }, 500);
    const parsed = JSON.parse(toolCall.function.arguments);

    return json({
      extracted_values: parsed.extracted_values,
      abnormalities: parsed.abnormalities,
      summary: parsed.summary,
      ai_analysis: {
        plain_language: parsed.plain_language,
        comparison_note: parsed.comparison_note,
        trend: history?.length ? parsed.trend : "first_report",
        recommendation: parsed.recommendation,
      },
      historical_count: history?.length ?? 0,
    });
  } catch (e) {
    console.error("analyze-medical-report error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
