// Afaan Oromo Speech-to-Text via Lovable AI (Gemini)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audio, mimeType, dialect } = await req.json();
    if (!audio || typeof audio !== "string") {
      return new Response(JSON.stringify({ error: "audio (base64) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dialectHint = dialect && dialect !== "general"
      ? ` The speaker uses the ${dialect} dialect of Afaan Oromo.`
      : "";

    // Map common mime types -> short format identifier expected by input_audio
    const mt = (mimeType || "audio/webm").toLowerCase();
    let format = "webm";
    if (mt.includes("wav")) format = "wav";
    else if (mt.includes("mpeg") || mt.includes("mp3")) format = "mp3";
    else if (mt.includes("mp4") || mt.includes("m4a")) format = "mp4";
    else if (mt.includes("ogg")) format = "ogg";
    else if (mt.includes("webm")) format = "webm";

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an expert Afaan Oromo (Oromo language) speech-to-text transcriber. " +
            "Transcribe the audio EXACTLY into Afaan Oromo using the standard Qubee Latin script. " +
            "Preserve long vowels (aa, ee, ii, oo, uu) and geminated consonants (kk, ff, jj, ll, mm, nn). " +
            "Add proper punctuation, capitalization, and natural sentence breaks. " +
            "Return ONLY the transcribed text, no explanations." +
            dialectHint,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this Afaan Oromo audio:" },
            { type: "input_audio", input_audio: { data: audio, format } },
          ],
        },
      ],
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      let userMsg = "Transcription failed.";
      if (aiRes.status === 429) userMsg = "Rate limit reached. Please try again shortly.";
      if (aiRes.status === 402) userMsg = "AI credits exhausted. Add credits to continue.";
      return new Response(JSON.stringify({ error: userMsg, detail: errText }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const text = data?.choices?.[0]?.message?.content?.trim?.() ?? "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("transcribe error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
