// Translation between Afaan Oromo, English, and Amharic via Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LANG_NAMES: Record<string, string> = {
  om: "Afaan Oromo (Qubee Latin script)",
  en: "English",
  am: "Amharic (Ge'ez script)",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, source, target } = await req.json();
    if (!text || !target) {
      return new Response(JSON.stringify({ error: "text and target are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const srcName = LANG_NAMES[source] ?? "auto-detected language";
    const tgtName = LANG_NAMES[target] ?? target;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content:
            `You are a professional translator. Translate the user's text from ${srcName} to ${tgtName}. ` +
            `Preserve tone, meaning, and proper names. For Afaan Oromo, use the standard Qubee Latin script with correct long vowels (aa, ee, ii, oo, uu) and geminated consonants. ` +
            `Return ONLY the translated text — no explanations, no quotes, no extra formatting.` },
          { role: "user", content: text },
        ],
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error("AI gateway error:", r.status, errText);
      let msg = "Translation failed.";
      if (r.status === 429) msg = "Rate limit reached. Please try again shortly.";
      if (r.status === 402) msg = "AI credits exhausted. Add credits to continue.";
      return new Response(JSON.stringify({ error: msg, detail: errText }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const translated = data?.choices?.[0]?.message?.content?.trim?.() ?? "";
    return new Response(JSON.stringify({ text: translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("translate error:", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
