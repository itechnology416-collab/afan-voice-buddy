create extension if not exists vector;

create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  source_name text,
  summary text,
  language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists kb_chunks_document_idx on public.kb_chunks(document_id);
create index if not exists kb_chunks_embedding_idx on public.kb_chunks using hnsw (embedding vector_cosine_ops);

alter table public.kb_documents enable row level security;
alter table public.kb_chunks enable row level security;

create policy "KB documents readable by everyone" on public.kb_documents for select using (true);
create policy "Admins manage kb documents" on public.kb_documents for all using (public.is_admin()) with check (public.is_admin());

create policy "KB chunks readable by everyone" on public.kb_chunks for select using (true);
create policy "Admins manage kb chunks" on public.kb_chunks for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.kb_search(query_embedding vector(1536), match_count int default 8)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  title text,
  url text,
  source_name text,
  similarity float
)
language sql stable
set search_path = public
as $$
  select c.id as chunk_id, d.id as document_id, c.content, d.title, d.url, d.source_name,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  join public.kb_documents d on d.id = c.document_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;