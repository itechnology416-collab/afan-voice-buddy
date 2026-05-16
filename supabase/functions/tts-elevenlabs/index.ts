// ElevenLabs Premium Text-to-Speech
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, voiceId, stability, similarity, style, speed } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const vId = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Sarah default
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability ?? 0.55,
            similarity_boost: similarity ?? 0.8,
            style: style ?? 0.4,
            use_speaker_boost: true,
            speed: speed ?? 1.0,
          },
        }),
      }
    );
    if (!r.ok) {
      const errText = await r.text();
      console.error("ElevenLabs error:", r.status, errText);
      let userMsg = `Premium voice service error (${r.status}).`;
      if (r.status === 401) userMsg = "ElevenLabs API key is invalid or missing. Please update it in project settings.";
      else if (r.status === 402 || /quota|credit|payment/i.test(errText)) userMsg = "ElevenLabs quota exhausted. Add credits or switch to Browser voice.";
      else if (r.status === 422) userMsg = "Voice request rejected — try shortening the text or pick a different voice.";
      else if (r.status === 429) userMsg = "Too many requests. Please wait a few seconds and retry.";
      else if (r.status >= 500) userMsg = "ElevenLabs service is temporarily unavailable. Please retry shortly.";
      return new Response(JSON.stringify({ error: userMsg, status: r.status, retryable: r.status === 429 || r.status >= 500 }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = await r.arrayBuffer();
    const audioContent = base64Encode(new Uint8Array(buf));
    return new Response(JSON.stringify({ audioContent, mimeType: "audio/mpeg" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tts-elevenlabs error:", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
