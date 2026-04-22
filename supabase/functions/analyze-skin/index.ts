// AI vision analysis edge function.
// Combines a Lovable AI (Gemini) multimodal call with the client-supplied
// color features and historical reports to produce a structured assessment.

// @ts-ignore - Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ColorFeatures {
  yellowRatio: number;
  redRatio: number;
  darkRatio: number;
  brightness: number;
  avgR: number;
  avgG: number;
  avgB: number;
}

interface RuleResult {
  condition: string;
  severity: "none" | "mild" | "moderate" | "severe";
  ruleConfidence: number;
}

interface HistoryItem {
  condition: string;
  severity: string;
  confidence: number;
  created_at: string;
}

const SEVERITY_SCORE: Record<string, number> = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

function severityFromScore(s: number): "none" | "mild" | "moderate" | "severe" {
  if (s >= 2.5) return "severe";
  if (s >= 1.5) return "moderate";
  if (s >= 0.5) return "mild";
  return "none";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      imageBase64,
      region,
      colorFeatures,
      ruleResult,
      mlPredictions,
    }: {
      imageBase64: string;
      region: "eye" | "skin" | "palm";
      colorFeatures: ColorFeatures;
      ruleResult: RuleResult;
      mlPredictions?: {
        probabilities: { healthy: number; jaundice: number; redness: number };
        topClass: "healthy" | "jaundice" | "redness";
        topConfidence: number;
        imageQuality: "good" | "fair" | "poor";
        modelVersion: string;
        bodyRegion?: {
          guess: "eye_region" | "skin_region" | "not_body";
          confidence: number;
          reason: string;
        };
      } | null;
    } = body;

    if (!imageBase64 || !region || !colorFeatures || !ruleResult) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side safety gate: if client forwarded a "not_body" image,
    // refuse to run the medical-style assessment.
    if (mlPredictions?.bodyRegion?.guess === "not_body") {
      return new Response(
        JSON.stringify({
          error: "Invalid image. Please upload a clear eye or skin image.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull last 5 reports for trend analysis
    const { data: history } = await supabase
      .from("reports")
      .select("condition, severity, confidence, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const historyText = (history as HistoryItem[] | null)?.length
      ? (history as HistoryItem[])
          .map(
            (h, i) =>
              `${i + 1}. ${h.created_at.slice(0, 10)} — ${h.condition} (${h.severity}, ${h.confidence}%)`
          )
          .join("\n")
      : "No previous reports.";

    const mlText = mlPredictions
      ? `On-device neural model (MobileNetV2 + skin head):
- Top class: ${mlPredictions.topClass} (${mlPredictions.topConfidence}%)
- Probabilities: healthy ${(mlPredictions.probabilities.healthy * 100).toFixed(1)}%, jaundice ${(mlPredictions.probabilities.jaundice * 100).toFixed(1)}%, redness ${(mlPredictions.probabilities.redness * 100).toFixed(1)}%
- Image quality: ${mlPredictions.imageQuality}`
      : "On-device neural model: not available for this analysis.";

    const systemPrompt = `You are SkinScope AI, an educational wellness assistant that analyzes images of skin, eyes, or palms for visible color-based signs (yellowing suggesting possible jaundice, redness suggesting possible burns or inflammation). You are NOT a medical device and must never give a clinical diagnosis. Be cautious, emphasize "possible" / "appears", and always recommend consulting a healthcare professional for any concerning findings. Always return valid JSON via the provided tool.`;

    const userPrompt = `Analyze this ${region} image using THREE independent signals.

1. Client-side color analysis:
- Yellow pixel ratio: ${colorFeatures.yellowRatio}%
- Red pixel ratio: ${colorFeatures.redRatio}%
- Dark pixel ratio: ${colorFeatures.darkRatio}%
- Brightness: ${colorFeatures.brightness}/100
- Avg RGB: (${colorFeatures.avgR}, ${colorFeatures.avgG}, ${colorFeatures.avgB})

2. Rule-based pre-assessment:
- Condition: ${ruleResult.condition}
- Severity: ${ruleResult.severity}
- Rule confidence: ${ruleResult.ruleConfidence}%

3. ${mlText}

User's recent report history (most recent first):
${historyText}

CRITICAL OUTPUT RULES:
- "condition" MUST be one of EXACTLY these three strings: "normal", "jaundice_possible", "unclear".
- Do NOT mention or speculate about malaria, infections, cancer, or any disease outside jaundice signs.
- Choose "jaundice_possible" only if visible yellowing of the sclera/skin is genuinely present.
- Choose "normal" if the region looks healthy and unremarkable.
- Choose "unclear" if image quality is poor, signals disagree, or you cannot confidently judge.
- "observations" must be a short, factual visual description — no diagnoses.
- Always recommend consulting a healthcare professional when anything other than "normal" is reported.

Reconcile all three signals with what you actually see. If the on-device model and color rules agree, lean into that. If they disagree, weigh visual evidence and lower confidence. If image quality is "poor", return "unclear" with low confidence. Compare with history for trend (improving / stable / worsening / first_report).`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_assessment",
                description: "Return the structured wellness assessment.",
                parameters: {
                  type: "object",
                  properties: {
                    condition: {
                      type: "string",
                      enum: ["normal", "jaundice_possible", "unclear"],
                      description: "Closed-set wellness label. MUST be exactly one of the three enum values.",
                    },
                    severity: {
                      type: "string",
                      enum: ["none", "mild", "moderate", "severe"],
                    },
                    confidence: {
                      type: "number",
                      description: "0-100 confidence score for this assessment.",
                    },
                    observations: {
                      type: "string",
                      description: "2-4 sentences describing visible features and image quality.",
                    },
                    trend: {
                      type: "string",
                      enum: ["improving", "stable", "worsening", "first_report", "inconclusive"],
                    },
                    trend_note: {
                      type: "string",
                      description: "1-2 sentences explaining the trend conclusion.",
                    },
                    recommendation: {
                      type: "string",
                      description: "Practical wellness recommendation. Always include consulting a healthcare professional if any concerning sign is present.",
                    },
                  },
                  required: [
                    "condition",
                    "severity",
                    "confidence",
                    "observations",
                    "trend",
                    "trend_note",
                    "recommendation",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "submit_assessment" },
          },
        }),
      }
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI returned malformed response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Weighted final severity:
    //   50% Gemini  +  30% on-device ML  +  20% historical mean
    // (falls back gracefully if ML or history are missing)
    const histArr = (history as HistoryItem[] | null) ?? [];
    const aiScore = SEVERITY_SCORE[parsed.severity] ?? 0;

    let mlScore = aiScore;
    if (mlPredictions) {
      // Map ML probabilities → 0..3 severity scale.
      // healthy=0, jaundice/redness contribute up to 3 based on probability.
      const p = mlPredictions.probabilities;
      const nonHealthy = (p.jaundice ?? 0) + (p.redness ?? 0);
      mlScore = nonHealthy * 3;
    }

    const histScore = histArr.length
      ? histArr.reduce((sum, h) => sum + (SEVERITY_SCORE[h.severity] ?? 0), 0) / histArr.length
      : aiScore;

    const wAi = 0.5;
    const wMl = mlPredictions ? 0.3 : 0;
    const wHist = histArr.length ? 0.2 : 0;
    const wTotal = wAi + wMl + wHist || 1;
    const blended = (aiScore * wAi + mlScore * wMl + histScore * wHist) / wTotal;
    const finalSeverity = severityFromScore(blended);

    // Quality penalty: if on-device model flagged a poor image, knock confidence down.
    let confidence = Math.min(99, Math.max(20, Math.round(parsed.confidence)));
    if (mlPredictions?.imageQuality === "poor") confidence = Math.max(20, confidence - 25);
    else if (mlPredictions?.imageQuality === "fair") confidence = Math.max(20, confidence - 10);

    const result = {
      condition: parsed.condition,
      severity: finalSeverity,
      raw_severity: parsed.severity,
      confidence,
      observations: parsed.observations,
      trend: histArr.length ? parsed.trend : "first_report",
      trend_note: parsed.trend_note,
      recommendation: parsed.recommendation,
      historical_count: histArr.length,
      signal_weights: { ai: wAi / wTotal, ml: wMl / wTotal, history: wHist / wTotal },
      ml_used: !!mlPredictions,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-skin error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
