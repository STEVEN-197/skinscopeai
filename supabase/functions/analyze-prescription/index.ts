// Prescription / medicine OCR + interpretation via Gemini multimodal.
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
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return j({ error: "Unauthorized" }, 401);

    const { imageBase64 } = await req.json();
    if (!imageBase64) return j({ error: "imageBase64 required" }, 400);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a careful medical OCR assistant. Extract handwritten or printed prescription content from the image. Identify medicines as accurately as possible. Never invent. Mark uncertain readings with '(?)'. Always remind that interpretations are AI-assisted and not a substitute for the prescribing doctor.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Read this prescription / medicine image. Extract: raw text, list of medicines with name, dosage, frequency, duration if available, and a friendly explanation of what each medicine is generally used for, plus common precautions.",
              },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_prescription",
              parameters: {
                type: "object",
                properties: {
                  raw_text: { type: "string" },
                  doctor_name: { type: "string" },
                  prescribed_date: { type: "string", description: "YYYY-MM-DD if visible" },
                  medicines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        dosage: { type: "string" },
                        frequency: { type: "string" },
                        duration: { type: "string" },
                        purpose: { type: "string" },
                        precautions: { type: "string" },
                        side_effects: { type: "string" },
                      },
                      required: ["name"],
                    },
                  },
                  ai_explanation: { type: "string" },
                },
                required: ["raw_text", "medicines", "ai_explanation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_prescription" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return j({ error: "Rate limit exceeded" }, 429);
      if (aiResp.status === 402) return j({ error: "AI credits exhausted" }, 402);
      return j({ error: "AI service error" }, 500);
    }
    const aiData = await aiResp.json();
    const tc = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return j({ error: "Malformed AI response" }, 500);
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
