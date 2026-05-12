// JARVIS health assistant — streaming chat with personal health context.
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const userId = u.user.id;

    // Pull personal health context (small slice)
    const [r, m, d, p, l] = await Promise.all([
      supabase.from("reports").select("region,condition,severity,confidence,trend,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("medical_reports").select("report_type,extracted_values,abnormalities,summary,report_date").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("symptom_diary").select("entry_date,itch,pain,redness,dryness,irritation,swelling,triggers").eq("user_id", userId).order("entry_date", { ascending: false }).limit(7),
      supabase.from("prescriptions").select("doctor_name,prescribed_date,medicines,ai_explanation").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("lifestyle_logs").select("log_date,sleep_hours,water_glasses,stress_level,exercise_minutes,diet_quality").eq("user_id", userId).order("log_date", { ascending: false }).limit(7),
    ]);

    const context = `
USER HEALTH CONTEXT (most recent first):
Recent visual scans: ${JSON.stringify(r.data ?? [])}
Recent lab/medical reports: ${JSON.stringify(m.data ?? [])}
Symptom diary (last 7): ${JSON.stringify(d.data ?? [])}
Prescriptions: ${JSON.stringify(p.data ?? [])}
Lifestyle logs (last 7): ${JSON.stringify(l.data ?? [])}
`;

    const systemPrompt = `You are JARVIS, the SkinScope AI personal health assistant. You answer health questions in a calm, friendly, conversational tone. Use the user's personal health context (provided below) to ground your answers when relevant. Reference their actual scans, lab values, symptoms, prescriptions, and lifestyle logs when applicable.

CRITICAL RULES:
- Never give a medical diagnosis. Use phrases like "appears", "may suggest", "could be associated with".
- Always recommend consulting a licensed healthcare professional for concerning findings.
- Explain medical terms in plain language.
- Be concise unless the user asks for detail. Use markdown formatting (lists, **bold**) where helpful.
- If asked about medicine, explain general purpose, common dosage timing, and common side effects, but never prescribe.

${context}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("jarvis-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
