// Generate longitudinal AI health insights by correlating
// scan reports + medical lab reports + symptom diary.

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (!LOVABLE_API_KEY) return j({ error: "AI not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return j({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const [reportsRes, medRes, diaryRes] = await Promise.all([
      supabase
        .from("reports")
        .select("region, condition, severity, confidence, trend, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("medical_reports")
        .select("report_type, extracted_values, abnormalities, summary, ai_analysis, report_date, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("symptom_diary")
        .select("entry_date, itch, pain, redness, dryness, irritation, swelling, triggers")
        .eq("user_id", userId)
        .order("entry_date", { ascending: false })
        .limit(20),
    ]);

    const scans = reportsRes.data ?? [];
    const meds = medRes.data ?? [];
    const diary = diaryRes.data ?? [];

    if (scans.length === 0 && meds.length === 0 && diary.length === 0) {
      return j({
        empty: true,
        summary: "Not enough history to generate health insights yet. Add a scan, lab report, or diary entry to get started.",
        observations: [],
        trends: [],
        recommendations: [],
      });
    }

    const systemPrompt = `You are SkinScope Health Intelligence, an AI assistant that produces longitudinal, multi-modal wellness observations. You correlate visual scan analyses with lab report values and self-reported symptom diary data. Use cautious language and never give a clinical diagnosis. Always recommend consulting a healthcare professional for concerning trends. Always return JSON via the provided tool.`;

    const userPrompt = `Analyze this user's combined health history.

VISUAL SCANS (most recent first):
${JSON.stringify(scans, null, 2)}

LAB / MEDICAL REPORTS (most recent first):
${JSON.stringify(meds, null, 2)}

SYMPTOM DIARY (most recent first):
${JSON.stringify(diary, null, 2)}

Tasks:
1) Write a 2-3 sentence overall summary of the user's recent health trajectory.
2) Produce 3-6 observations correlating signals across the three sources (e.g., "Visual yellowing trend aligns with elevated bilirubin in latest lab report").
3) Identify 2-5 trends per metric (improving/stable/worsening) with brief notes.
4) Provide 3-6 personalized recommendations (hydration, lifestyle, skincare, when to consult a clinician).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_insights",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  observations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        detail: { type: "string" },
                        level: { type: "string", enum: ["info", "watch", "concern"] },
                      },
                      required: ["title", "detail", "level"],
                    },
                  },
                  trends: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        metric: { type: "string" },
                        direction: { type: "string", enum: ["improving", "stable", "worsening", "inconclusive"] },
                        note: { type: "string" },
                      },
                      required: ["metric", "direction", "note"],
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        detail: { type: "string" },
                        category: { type: "string", enum: ["hydration", "skincare", "lifestyle", "monitoring", "consultation"] },
                      },
                      required: ["title", "detail", "category"],
                    },
                  },
                },
                required: ["summary", "observations", "trends", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_insights" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return j({ error: "Rate limit exceeded." }, 429);
      if (aiResp.status === 402) return j({ error: "AI credits exhausted." }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return j({ error: "AI service error" }, 500);
    }
    const aiData = await aiResp.json();
    const tc = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return j({ error: "Malformed AI response" }, 500);
    const parsed = JSON.parse(tc.function.arguments);

    // Persist insight
    const inputs_snapshot = {
      scans_count: scans.length,
      meds_count: meds.length,
      diary_count: diary.length,
    };
    await supabase.from("health_insights").insert({
      user_id: userId,
      summary: parsed.summary,
      observations: parsed.observations,
      trends: parsed.trends,
      recommendations: parsed.recommendations,
      inputs_snapshot,
    });

    return j({ ...parsed, inputs_snapshot });
  } catch (e) {
    console.error("generate-insights error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }

  function j(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
