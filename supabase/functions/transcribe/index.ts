// Afaan Oromo Speech-to-Text via Lovable AI (Gemini)
// Enhanced with comprehensive native-speaker linguistic knowledge across all dialects.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DIALECT_GUIDE: Record<string, string> = {
  general: "Standard written Afaan Oromo (Qubee). Neutral phonology.",
  arsi: "Arsi dialect (Arsi/Bale zone). Slightly softer 'c' [tʃ], frequent use of '-tti', '-rraa'. Common words: 'maal jirta', 'akkam jirta'.",
  bale: "Bale dialect. Close to Arsi; preserves long vowels strongly. Common copula '-dha' often heard as '-da'.",
  borana: "Borana (southern Oromia/Kenya). Conservative phonology, strong glottal stops, retains '-ddhaa'. Lexicon: 'akkam', 'nagaa', 'fayyaa'. Pastoralist vocabulary (loon, re'ee).",
  guji: "Guji dialect (Guji zone). Similar to Borana; distinct pitch accent; 'k' sometimes fricated.",
  harar: "Harar / eastern (Ittu, Karrayyu, Aniyya). Loanwords from Harari/Somali/Arabic. 'q' is sharply ejective [qʼ].",
  ittu: "Ittu (West Hararghe). Eastern features; some Amharic loans.",
  karrayyu: "Karrayyu (pastoralist, eastern Shewa). Conservative; many cattle-related terms.",
  wallaga: "Wallaga / Maccaa (western Oromia). 'dh' [ɗ] very crisp; 'ph' [pʼ] used in loans; common greeting 'attam jirta'.",
  maccaa: "Maccaa cluster (Wallaga, Iluu, Jimma). Western pronunciation; 'h' often dropped intervocalically.",
  shewa: "Shewa / Tuulama (central Oromia). Closest to media-standard; clear Qubee orthography.",
  tuulama: "Tuulama (central Shewa). Standard educated register; 'q' fully ejective.",
  raya: "Raya (Tigray/Amhara border). Heavy Amharic/Tigrinya contact; some vowel reduction.",
  wallo: "Wallo (northern). Amharic loanwords frequent; '-cha/-chi' suffixes common.",
  jimma: "Jimma (southwestern). Maccaa subgroup; coffee-region vocabulary.",
  iluu: "Iluu Abbaa Booraa (southwestern). Maccaa subgroup; preserves geminates.",
  kemise: "Kemise (Oromo of Wallo, Amhara region). Strong Amharic influence; code-switching common.",
  orma: "Orma (Kenya, Tana River). Conservative southern variety; some Swahili loans.",
  waata: "Waata (Kenya coastal). Hunter-gatherer community variety; loans from Mijikenda/Swahili.",
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

    const dKey = (dialect || "general").toLowerCase();
    const dialectHint = DIALECT_GUIDE[dKey] ?? DIALECT_GUIDE.general;

    const mt = (mimeType || "audio/webm").toLowerCase();
    let format = "webm";
    if (mt.includes("wav")) format = "wav";
    else if (mt.includes("mpeg") || mt.includes("mp3")) format = "mp3";
    else if (mt.includes("mp4") || mt.includes("m4a")) format = "mp4";
    else if (mt.includes("ogg")) format = "ogg";

    const systemPrompt = [
      "You are a native Afaan Oromo (Oromo language, ISO 639-3: orm) speech-to-text expert.",
      "You natively understand ALL Afaan Oromo dialects: Borana, Guji, Arsi, Bale, Harar (Ittu/Karrayyu/Aniyya), Wallaga, Maccaa, Tuulama (Shewa), Raya, Wallo, Jimma, Iluu Abbaa Booraa, Kemise, Orma (Kenya), and Waata (Kenya).",
      "Transcribe the audio EXACTLY in Afaan Oromo using standard Qubee (Latin) script as codified by the Oromia Education Bureau.",
      "Phonology rules you MUST respect:",
      "- Seven vowels: a, e, i, o, u — long vowels are doubled (aa, ee, ii, oo, uu) and ARE phonemically distinct (e.g. 'bara' year vs 'baraa' learn).",
      "- Geminate (doubled) consonants are phonemic: kk, tt, pp, ff, ss, mm, nn, ll, rr, bb, dd, gg, cc, jj, ww, yy. Transcribe them faithfully.",
      "- Ejectives & special consonants: q [kʼ], c [tʃʼ], x [tʼ], ph [pʼ], dh [ɗ], ny [ɲ], sh [ʃ], ch [tʃ].",
      "- Glottal stop is written with apostrophe ' (e.g. har'a, sa'a, du'a).",
      "- Do NOT use Amharic Fidel script. Latin Qubee only.",
      "Orthography rules:",
      "- Sentence-initial capital and proper nouns capitalized.",
      "- Use ., ?, ! and , correctly.",
      "- Write loanwords (from Amharic, English, Arabic, Swahili) in Qubee spelling, not original script.",
      "- Common particles: -tti, -rraa, -dhaa, -iif, -keessa, -irra are attached without space.",
      `Dialect context for this audio: ${dialectHint}`,
      "If the speaker code-switches into Amharic or English, transliterate code-switched words into Qubee and keep them inline.",
      "Add natural punctuation, sentence breaks, paragraph breaks for monologues.",
      "Return ONLY the transcribed Afaan Oromo text. No translation, no explanations, no markdown.",
    ].join("\n");

    const body = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this Afaan Oromo audio in Qubee script:" },
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
      // Fallback to ElevenLabs scribe_v2 on credit/rate/server errors.
      if (aiRes.status === 402 || aiRes.status === 429 || aiRes.status >= 500) {
        const elKey = Deno.env.get("ELEVENLABS_API_KEY");
        if (elKey) {
          try {
            const bin = atob(audio);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const ext = format === "mpeg" ? "mp3" : format;
            const fd = new FormData();
            fd.append("file", new Blob([bytes], { type: mt }), `audio.${ext}`);
            fd.append("model_id", "scribe_v2");
            fd.append("diarize", "false");
            fd.append("language_code", "orm");
            const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
              method: "POST",
              headers: { "xi-api-key": elKey },
              body: fd,
            });
            if (r.ok) {
              const d = await r.json();
              const text = (d?.text ?? "").trim();
              return new Response(JSON.stringify({ text, fallback: "elevenlabs" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            // retry without language_code (auto-detect)
            const fd2 = new FormData();
            fd2.append("file", new Blob([bytes], { type: mt }), `audio.${ext}`);
            fd2.append("model_id", "scribe_v2");
            fd2.append("diarize", "false");
            const r2 = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
              method: "POST", headers: { "xi-api-key": elKey }, body: fd2,
            });
            if (r2.ok) {
              const d = await r2.json();
              const text = (d?.text ?? "").trim();
              return new Response(JSON.stringify({ text, fallback: "elevenlabs" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            console.error("ElevenLabs fallback failed:", r2.status, await r2.text());
          } catch (e) {
            console.error("ElevenLabs fallback exception:", e);
          }
        }
      }
      let userMsg = "Transcription failed.";
      if (aiRes.status === 429) userMsg = "Rate limit reached. Please try again shortly.";
      if (aiRes.status === 402) userMsg = "AI credits exhausted — add Lovable AI credits or set an ElevenLabs API key for fallback.";
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
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
