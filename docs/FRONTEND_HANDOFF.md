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

Sprint 5 adds optional execution hints:

```json
{
  "canExecute": true,
  "executeEndpoint": "/api/agent/execute"
}
```

For imported projects, use the `project.id` returned by `POST /api/repos/import` as `projectId`.

## Safe Patch Execution

Frontend flow:

1. Call `POST /api/agent/execute`.
2. Render `plan`, `patchPreview`, `testsToRun`, and `risks`.
3. Show an Apply Patch button only after patch preview is visible.
4. Call `POST /api/patches/:taskId/apply` with `{ "approve": true }`.
5. Show `branchName`, `commitSha`, and `prUrl` on success.

Do not call apply automatically. The backend rejects `approve:false`.

Local demos use `MOCK_GITHUB_WRITE=true`, which simulates branch/commit/PR. Real GitHub apply requires `GITHUB_TOKEN` and repo write access.

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

Re-importing the same repo is idempotent. The second response includes `importSummary.projectReused: true`; duplicate architecture memory is skipped.

## Graph

Use:

```http
GET /api/projects/demo-shopease/graph
```

The response is React Flow-compatible: `nodes` and `edges`, with `id`, `type`, `data.label`, and `position`.

Sprint 4.1 graph output is grouped for demo cleanliness. Nodes may include `data.count`; repeated tasks may render as labels like `Summarize the project architecture × 2`.

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

Full task details:

```http
GET /api/tasks/:projectId/:taskId
```

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

## Demo Cleanup

For local hackathon demos:

```http
POST /api/dev/reset
DELETE /api/projects/:projectId
```

`DELETE` only works for imported projects. `demo-shopease` returns a safe error.

## Notes

- Mock mode returns deterministic content and is suitable for the hackathon demo.
- Frontend APIs from Sprint 1 are stable and response shapes are unchanged.
- `MEMORY_PROVIDER=local` is the default.
- Retained memories persist locally in `backend/.data/runtime-memories.json`.
- Hindsight provider can be enabled with env vars. Each project maps to one bank ID, e.g. `devcontext:demo-shopease`.
- If Hindsight is not configured or a call fails, backend falls back to local memory.
- Public GitHub import is available; pgvector is still future work.
- GitHub PR creation is available behind the approved apply endpoint when `MOCK_GITHUB_WRITE=false` and `GITHUB_TOKEN` has write access.
- Imports are limited to the top 40 useful files for the MVP.
- Duplicate memories are skipped, and graph output groups duplicate-looking nodes.
- Applied tasks add task status and PR nodes to the graph when `prUrl` exists.
- No frontend code should be placed under `backend/`.
