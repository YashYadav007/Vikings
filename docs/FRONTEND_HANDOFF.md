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

## Graph

Use:

```http
GET /api/projects/demo-shopease/graph
```

The response is React Flow-compatible: `nodes` and `edges`, with `id`, `type`, `data.label`, and `position`.

## Memory Timeline

Use:

```http
GET /api/projects/demo-shopease/memory
```

Memories are returned chronologically.

## Memory Debug/Export

Use:

```http
GET /api/memory/demo-shopease
```

This returns the active memory `provider` plus all visible memories, including locally retained runtime memories.

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

## Notes

- Mock mode returns deterministic content and is suitable for the hackathon demo.
- Frontend APIs from Sprint 1 are stable and response shapes are unchanged.
- `MEMORY_PROVIDER=local` is the default.
- Retained memories persist locally in `backend/.data/runtime-memories.json`.
- Hindsight provider scaffolding exists, but real Hindsight calls are pending.
- No frontend code should be placed under `backend/`.
