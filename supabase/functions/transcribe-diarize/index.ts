// ElevenLabs scribe_v2 transcription with speaker diarization + word timestamps.
// Accepts base64 audio + mimeType. Returns { text, words: [{text,start,end,speaker}] }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { audio, mimeType, diarize, languageCode } = await req.json();
    if (!audio || typeof audio !== "string") {
      return new Response(JSON.stringify({ error: "audio (base64) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = base64ToBytes(audio);
    const mt = mimeType || "audio/wav";
    const ext = mt.includes("wav") ? "wav" : mt.includes("mp3") || mt.includes("mpeg") ? "mp3"
      : mt.includes("mp4") || mt.includes("m4a") ? "m4a" : mt.includes("ogg") ? "ogg" : "webm";

    const fd = new FormData();
    fd.append("file", new Blob([bytes], { type: mt }), `audio.${ext}`);
    fd.append("model_id", "scribe_v2");
    fd.append("tag_audio_events", "false");
    fd.append("diarize", diarize === false ? "false" : "true");
    // Afaan Oromo ISO 639-3 = orm. Fall back to auto-detect if not supported.
    fd.append("language_code", languageCode || "orm");
    fd.append("timestamps_granularity", "word");

    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: fd,
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("ElevenLabs scribe error:", r.status, errText);
      let msg = "Diarized transcription failed.";
      if (r.status === 401) msg = "ElevenLabs API key invalid.";
      if (r.status === 402 || r.status === 429) msg = "ElevenLabs quota/rate limit reached.";
      // If language not supported, retry once with auto-detect.
      if (errText.toLowerCase().includes("language")) {
        const fd2 = new FormData();
        fd2.append("file", new Blob([bytes], { type: mt }), `audio.${ext}`);
        fd2.append("model_id", "scribe_v2");
        fd2.append("diarize", "true");
        fd2.append("timestamps_granularity", "word");
        const r2 = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST", headers: { "xi-api-key": apiKey }, body: fd2,
        });
        if (r2.ok) {
          const d2 = await r2.json();
          return new Response(JSON.stringify(d2), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      return new Response(JSON.stringify({ error: msg, detail: errText }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    // Normalize per-word confidence (ElevenLabs returns logprob).
    if (Array.isArray(data?.words)) {
      data.words = data.words.map((w: Record<string, unknown>) => {
        const lp = typeof w.logprob === "number" ? (w.logprob as number) : undefined;
        const confidence =
          typeof w.confidence === "number"
            ? (w.confidence as number)
            : lp != null
            ? Math.max(0, Math.min(1, Math.exp(lp)))
            : undefined;
        return { ...w, confidence };
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("transcribe-diarize error:", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
