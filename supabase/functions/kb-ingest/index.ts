import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function htmlToText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text: body };
}

function chunk(text: string, size = 900, overlap = 150): string[] {
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let buf = "";
  for (const s of sentences) {
    if ((buf + " " + s).length > size) {
      if (buf) out.push(buf.trim());
      buf = buf.length > overlap ? buf.slice(-overlap) + " " + s : s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(c => c.length > 80);
}

async function embed(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: texts, dimensions: 1536 }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, source_name, language } = await req.json();
    if (!url || typeof url !== "string") return json({ error: "url required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // Authenticate caller and require admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    // Fetch page
    const pageRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 AfaanOromoBot/1.0" } });
    if (!pageRes.ok) return json({ error: `fetch failed: ${pageRes.status}` }, 400);
    const html = await pageRes.text();
    const { title, text } = htmlToText(html);
    if (text.length < 200) return json({ error: "page text too short" }, 400);

    const chunks = chunk(text);
    if (!chunks.length) return json({ error: "no chunks produced" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Upsert document
    const { data: doc, error: docErr } = await admin
      .from("kb_documents")
      .upsert({
        url,
        title: title || url,
        source_name: source_name ?? new URL(url).hostname,
        language: language ?? "en",
        summary: chunks[0].slice(0, 280),
        updated_at: new Date().toISOString(),
      }, { onConflict: "url" })
      .select()
      .single();
    if (docErr) throw docErr;

    // Clear previous chunks
    await admin.from("kb_chunks").delete().eq("document_id", doc.id);

    // Embed in batches of 64
    const inserts: any[] = [];
    for (let i = 0; i < chunks.length; i += 64) {
      const batch = chunks.slice(i, i + 64);
      const vecs = await embed(batch, LOVABLE_API_KEY);
      batch.forEach((content, j) => {
        inserts.push({ document_id: doc.id, chunk_index: i + j, content, embedding: vecs[j] });
      });
    }
    const { error: insErr } = await admin.from("kb_chunks").insert(inserts);
    if (insErr) throw insErr;

    return json({ ok: true, document_id: doc.id, chunks: inserts.length, title: doc.title });
  } catch (e) {
    console.error("kb-ingest error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
