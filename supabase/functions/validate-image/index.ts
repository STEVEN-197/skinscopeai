// Validates whether an image actually contains the requested body region
// (skin / face / eye / palm) before running heavier analysis.
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // @ts-ignore
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return j({ error: "AI not configured" }, 500);

    const { imageBase64, region } = await req.json();
    if (!imageBase64 || !region) return j({ error: "Missing fields" }, 400);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are an image content validator. Decide whether an image clearly shows the requested human body region (skin / eye / palm / face) suitable for visual wellness analysis. Reject paper, walls, random objects, blurred or extreme close-ups, screenshots, and irrelevant content.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Does this image clearly show a real human ${region}? Be strict.` },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_validation",
              parameters: {
                type: "object",
                properties: {
                  valid: { type: "boolean" },
                  detected: { type: "string", description: "What appears in the image" },
                  reason: { type: "string", description: "If invalid, why" },
                  quality: { type: "string", enum: ["good", "fair", "poor"] },
                },
                required: ["valid", "detected", "reason", "quality"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_validation" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return j({ error: "Rate limit exceeded" }, 429);
      if (aiResp.status === 402) return j({ error: "AI credits exhausted" }, 402);
      return j({ error: "Validation service error" }, 500);
    }
    const aiData = await aiResp.json();
    const tc = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return j({ valid: true, detected: "unknown", reason: "", quality: "fair" });
    return j(JSON.parse(tc.function.arguments));
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }

  function j(o: unknown, status = 200) {
    return new Response(JSON.stringify(o), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
