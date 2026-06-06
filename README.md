# DevContext OS

DevContext OS is a hackathon prototype for a memory-powered AI coding workspace where each GitHub repository gets a persistent project brain.

This sprint builds the backend/core only. The frontend is intentionally separate and can consume the API contracts in `docs/`.

## Run

```bash
npm install
npm run dev:backend
```

Backend URL:

```text
http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/health
```

## Recommended Low-Cost Hosted Config

Gemini is the recommended real provider for the hosted hackathon demo. OpenAI remains supported, and mock providers remain the no-key local fallback.

```env
CODING_AGENT_PROVIDER=gemini
CODING_AGENT_MODEL=gemini-2.0-flash
GEMINI_API_KEY=
USE_MOCK_LLM=false

EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSIONS=1536
RAG_PROVIDER=pgvector
RAG_FALLBACK_MODE=local
```

Gemini embeddings are requested at 1536 dimensions to match the existing Supabase `code_chunks.embedding vector(1536)` migration.

## Current Scope

- Provider-backed RAG: local keyword search by default, optional Supabase pgvector semantic search.
- Public GitHub repository import into local Project Brain data.
- Provider-backed memory layer with local JSON fallback.
- Optional Hindsight HTTP memory provider with verification endpoint.
- Local retained memories in `backend/.data/runtime-memories.json`.
- Local generated task records in `backend/.data/tasks.json`.
- Mock mode that works without LLM keys.
- Gemini-first coding-agent and embedding providers, with OpenAI still supported.
- React Flow-compatible graph data for the Project Brain.
- Safe agent execution and mock/real GitHub apply workflow.
- Stable frontend API contracts.

## Not In This Sprint

- Database persistence.
- Private GitHub repository import.
- Frontend UI.

## Memory Provider

Default:

```env
MEMORY_PROVIDER=local
HINDSIGHT_PROJECT_PREFIX=devcontext
HINDSIGHT_FALLBACK_MODE=local
```

To enable Hindsight:

```env
MEMORY_PROVIDER=hindsight
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your-key
HINDSIGHT_PROJECT_PREFIX=devcontext
HINDSIGHT_FALLBACK_MODE=local
```

Each project gets one bank ID: `{HINDSIGHT_PROJECT_PREFIX}:{projectId}`. Example: `devcontext:demo-shopease`.

If Hindsight credentials are missing or a Hindsight request fails, the backend falls back to the local JSON provider.

For clean Hindsight demos, set:

```env
HINDSIGHT_DEMO_SESSION_ID=demo2
```

This changes remote bank IDs to `{HINDSIGHT_PROJECT_PREFIX}:{HINDSIGHT_DEMO_SESSION_ID}:{projectId}` so old remote memories do not appear in a fresh demo.

## RAG Provider

Default local mode:

```env
RAG_PROVIDER=local
RAG_FALLBACK_MODE=local
```

Semantic mode with Gemini embeddings:

```env
RAG_PROVIDER=pgvector
RAG_FALLBACK_MODE=local
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_SCHEMA=public
GEMINI_API_KEY=your-gemini-key
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSIONS=1536
```

Run `backend/db/migrations/001_pgvector_rag.sql` in the Supabase SQL editor before enabling pgvector. If Supabase or embeddings are missing, the backend falls back to local keyword RAG.

Repo architecture summaries and initial architecture memories reflect the active RAG provider: pgvector imports mention semantic RAG using Supabase pgvector, while local imports mention keyword search. Chat compare and agent execution use the same active provider and fall back to top indexed chunks if a semantic architecture query returns no direct matches.

## Learning Loop

After an approved agent task, DevContext OS updates only touched files in RAG and retains concise task learning in memory:

- no full repo re-index after task apply
- no raw full code stored in Hindsight
- task memory includes what changed, why, risks, tests, PR URL, and RAG update summary
- future agent plans include `Memory influence` when prior learning is recalled
- Hindsight retain metadata stringifies arrays/objects such as `relatedFiles` and `tags` for provider compatibility, while API responses keep `relatedFiles` as arrays

Debug endpoints:

- `GET /api/memory/:projectId/learning-summary`
- `GET /api/memory/:projectId/quality-report`
- `GET /api/rag/:projectId/file-chunks?filePath=README.md`

Hindsight has a memory quality gate. It keeps durable task outcomes, decisions, risks, preferences, follow-ups, and material architecture changes, while rejecting duplicate/noisy operational logs such as standalone RAG indexing events.

## Coding Agent

The primary endpoint is `POST /api/tasks/run`. The coding-agent provider decides relevant files, plan, patch preview, risks, tests, and suggested Hindsight memories from RAG + Hindsight context.

Use `CODING_AGENT_PROVIDER=mock` for no-key local development. Use `CODING_AGENT_PROVIDER=gemini`, `CODING_AGENT_MODEL=gemini-2.0-flash`, `USE_MOCK_LLM=false`, and `GEMINI_API_KEY=your-key` for the recommended hosted coding-agent demo. OpenAI remains available with `CODING_AGENT_PROVIDER=openai` or `llm`. Compare mode remains available as a debug tool.

## Cache-First Projects

Imported projects are reusable from the dashboard. A normal repeat `POST /api/repos/import` returns the cached Project Brain immediately and does not fetch files, re-chunk, re-embed, or retain architecture memory again.

Use `forceReindex: true` or `POST /api/repos/:projectId/sync` for explicit refreshes. Reindex/sync uses SHA-256 file hashes and updates only changed/deleted files in RAG where possible. After task apply, DevContext still updates only touched files.

Cost guardrails:

```env
DISABLE_AUTO_REINDEX=true
MAX_EMBEDDING_FILES_PER_IMPORT=40
MAX_EMBEDDING_CHUNKS_PER_IMPORT=200
MAX_AGENT_CONTEXT_CHUNKS=8
```

## Delete Project

Imported projects can be deleted from the dashboard or with:

```bash
curl -X DELETE http://localhost:4000/api/projects/:projectId
```

This removes the local project cache, file hashes, RAG chunks, generated tasks, and local runtime memories. `demo-shopease` is protected. Hindsight remote memories are not deleted when the provider lacks a safe delete API; use a fresh `HINDSIGHT_DEMO_SESSION_ID` for clean demos.

## Curated Demo Task

For the GitCode Chrome extension project, DevContext OS includes one reliable hackathon demo task:

```bash
curl -X POST http://localhost:4000/api/demo/gitcode-token-safety \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"github-yashyadav007-gitcode","mode":"safe-auto"}'
```

It demonstrates the real learning loop without depending on live LLM quota: Hindsight recall, RAG search/list, deterministic patch preview for `popup.js`/`popup.css`, GitHub mock or real PR creation, changed-file RAG update, and Hindsight task/risk memory retention.

## Import A Public GitHub Repo

```bash
curl -X POST http://localhost:4000/api/repos/import \
  -H 'Content-Type: application/json' \
  -d '{"repoUrl":"https://github.com/octocat/Hello-World"}'
```

`GITHUB_TOKEN` is optional for public repos, but recommended for rate limits.

Imported project data is persisted locally:

- `backend/.data/projects.json`
- `backend/.data/rag-chunks.json`

Use the returned `project.id` with existing APIs:

- `GET /api/projects/:projectId`
- `POST /api/chat/compare`
- `GET /api/projects/:projectId/graph`
- `GET /api/projects/:projectId/memory`
- `GET /api/rag/:projectId/chunks`
- `GET /api/rag/provider/status`
- `GET /api/system/status`
- `GET /api/projects/:projectId/context-debug`
- `GET /api/memory/:projectId/learning-summary`
- `GET /api/rag/:projectId/file-chunks?filePath=README.md`

## Generated Files

`backend/dist` is generated by `npm run build` and ignored. Local runtime JSON under `backend/.data` is also ignored.
