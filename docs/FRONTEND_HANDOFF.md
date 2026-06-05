# Frontend Handoff

Backend base URL:

```text
http://localhost:4000
```

## Main Compare Panel

Use:

```http
POST /api/chat/compare
```

Request:

```json
{
  "projectId": "demo-shopease",
  "message": "Add coupon discount support"
}
```

Render `genericAnswer` beside `memoryAnswer`. Show `chunksUsed`, `memoriesUsed`, `patchPreview`, and `memoryToSave` as supporting evidence for DevContext AI.

Sprint 3 adds optional `memoryProvider` to this response. Frontend can show it as a small badge (`local` or `hindsight`) without changing the existing compare panel.

For imported projects, use the `project.id` returned by `POST /api/repos/import` as `projectId`.

## Repository Import

Use:

```http
POST /api/repos/import
```

Request:

```json
{
  "repoUrl": "https://github.com/owner/repo"
}
```

The response returns `project` and `importSummary`. Store `project.id` in frontend state, then call the existing project brain, graph, memory, RAG debug, and chat APIs with that ID.

## Graph

Use:

```http
GET /api/projects/demo-shopease/graph
```

The response is React Flow-compatible: `nodes` and `edges`, with `id`, `type`, `data.label`, and `position`.

For imported projects:

```http
GET /api/projects/:projectId/graph
```

## Memory Timeline

Use:

```http
GET /api/projects/demo-shopease/memory
```

Memories are returned chronologically.

For imported projects:

```http
GET /api/projects/:projectId/memory
```

## Memory Debug/Export

Use:

```http
GET /api/memory/demo-shopease
```

This returns the active memory `provider` plus all visible memories, including locally retained runtime memories.

Provider status:

```http
GET /api/memory/provider/status
```

Use this for a demo/debug badge showing active provider and whether Hindsight is configured.

## Generated Tasks

Use:

```http
GET /api/tasks/demo-shopease
```

This returns generated task records created by `POST /api/chat/memory` and `POST /api/chat/compare`. Suggested `memoryToSave` entries are not retained automatically; call `POST /api/memory/retain` when the user accepts a memory.

## Project Brain Summary

Use:

```http
GET /api/projects/demo-shopease
```

This contains stack, modules, risk areas, memory count, chunk count, and last task.

Imported projects use:

```http
GET /api/projects/:projectId
```

## RAG Debug

Use:

```http
GET /api/rag/:projectId/chunks
```

This shows the indexed local chunks for a project.

## Notes

- Mock mode returns deterministic content and is suitable for the hackathon demo.
- Frontend APIs from Sprint 1 are stable and response shapes are unchanged.
- `MEMORY_PROVIDER=local` is the default.
- Retained memories persist locally in `backend/.data/runtime-memories.json`.
- Hindsight provider can be enabled with env vars. Each project maps to one bank ID, e.g. `devcontext:demo-shopease`.
- If Hindsight is not configured or a call fails, backend falls back to local memory.
- Public GitHub import is available; pgvector and PR creation are still future work.
- Imports are limited to the top 40 useful files for the MVP.
- No frontend code should be placed under `backend/`.
