import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, limit } = await req.json();
    if (!query || typeof query !== "string") return json({ error: "query required" }, 400);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query, dimensions: 1536 }),
    });
    if (!embRes.ok) {
      if (embRes.status === 429) return json({ error: "Rate limited, please try again." }, 429);
      if (embRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: `embedding failed: ${embRes.status}` }, 500);
    }
    const { data } = await embRes.json();
    const vec = data[0].embedding as number[];

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: matches, error } = await supabase.rpc("kb_search", {
      query_embedding: vec as unknown as string,
      match_count: Math.min(Math.max(Number(limit) || 8, 1), 20),
    });
    if (error) throw error;
    return json({ matches });
  } catch (e) {
    console.error("kb-search error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
