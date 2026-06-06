-- DevContext OS Sprint 6 pgvector RAG migration
--
-- How to run in Supabase:
-- 1. Open your Supabase project.
-- 2. Go to SQL Editor.
-- 3. Paste this full file and run it.
-- 4. Set backend env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAG_PROVIDER=pgvector.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists code_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  file_path text not null,
  language text,
  module text,
  summary text,
  content text not null,
  start_line int,
  end_line int,
  symbols jsonb default '[]'::jsonb,
  source text default 'github',
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists code_chunks_project_id_idx
on code_chunks(project_id);

create index if not exists code_chunks_file_path_idx
on code_chunks(file_path);

-- Supabase pgvector commonly supports ivfflat. If this fails for a very small table,
-- run it again after inserting data or switch to hnsw if your Postgres version supports it.
create index if not exists code_chunks_embedding_idx
on code_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function match_code_chunks(
  query_embedding vector(1536),
  match_project_id text,
  match_count int default 8
)
returns table (
  id uuid,
  project_id text,
  file_path text,
  language text,
  module text,
  summary text,
  content text,
  start_line int,
  end_line int,
  symbols jsonb,
  source text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    code_chunks.id,
    code_chunks.project_id,
    code_chunks.file_path,
    code_chunks.language,
    code_chunks.module,
    code_chunks.summary,
    code_chunks.content,
    code_chunks.start_line,
    code_chunks.end_line,
    code_chunks.symbols,
    code_chunks.source,
    code_chunks.metadata,
    1 - (code_chunks.embedding <=> query_embedding) as similarity
  from code_chunks
  where code_chunks.project_id = match_project_id
  order by code_chunks.embedding <=> query_embedding
  limit match_count;
$$;
