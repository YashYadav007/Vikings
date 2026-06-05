# API Contract

Base URL:

```text
http://localhost:4000
```

All Sprint 1 and Sprint 2 response shapes remain compatible. Sprint 3 only adds optional metadata fields and new memory-provider endpoints.

## GET /health

```json
{
  "status": "ok",
  "service": "devcontext-os-backend"
}
```

## GET /api/projects

Returns demo projects.

## GET /api/projects/demo-shopease

Returns project brain summary: `id`, `name`, `repoUrl`, `stack`, `modules`, `memoryCount`, `chunkCount`, `riskAreas`, `lastTask`.

## GET /api/projects/demo-shopease/memory

Returns chronological memory timeline.

```json
{
  "memories": []
}
```

## GET /api/projects/demo-shopease/graph

Returns React Flow-compatible graph data.

```json
{
  "nodes": [{ "id": "project-demo-shopease", "type": "project", "data": { "label": "ShopEase" }, "position": { "x": 400, "y": 0 } }],
  "edges": [{ "id": "edge-project-cart", "source": "project-demo-shopease", "target": "module-cart", "label": "has module" }]
}
```

## POST /api/rag/search

```bash
curl -X POST http://localhost:4000/api/rag/search \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","query":"Add coupon discount support"}'
```

Response:

```json
{
  "chunks": []
}
```

## GET /api/memory/provider/status

```bash
curl http://localhost:4000/api/memory/provider/status
```

Response:

```json
{
  "activeProvider": "local",
  "configuredProvider": "local",
  "hindsightConfigured": false,
  "fallbackMode": "local",
  "bankIdExample": "devcontext:demo-shopease"
}
```

## GET /api/memory/:projectId

Debug/export endpoint for memory provider state.

```bash
curl http://localhost:4000/api/memory/demo-shopease
```

Response:

```json
{
  "projectId": "demo-shopease",
  "provider": "local",
  "memories": []
}
```

## POST /api/memory/recall

```bash
curl -X POST http://localhost:4000/api/memory/recall \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","query":"coupon calculation order"}'
```

Response:

```json
{
  "memories": [
    {
      "id": "memory-coupon-order",
      "projectId": "demo-shopease",
      "type": "decision",
      "title": "Coupon calculation order",
      "content": "...",
      "relatedFiles": ["src/lib/cartService.ts"],
      "createdAt": "2026-05-05T10:30:00.000Z",
      "score": 4
    }
  ]
}
```

## POST /api/memory/retain

```bash
curl -X POST http://localhost:4000/api/memory/retain \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","memory":{"type":"decision","title":"Coupon calculation order","content":"Apply coupon after quantity normalization","relatedFiles":["src/lib/cartService.ts"]}}'
```

Response shape is unchanged:

```json
{
  "success": true,
  "memory": {
    "id": "memory-generated",
    "projectId": "demo-shopease",
    "type": "decision",
    "title": "Coupon calculation order",
    "content": "Apply coupon after quantity normalization",
    "relatedFiles": ["src/lib/cartService.ts"],
    "createdAt": "2026-06-05T00:00:00.000Z"
  }
}
```

## POST /api/memory/reflect

```bash
curl -X POST http://localhost:4000/api/memory/reflect \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","query":"What should we remember after adding coupon support?","context":{"task":"Add coupon support","filesTouched":["src/lib/cartService.ts"],"memoriesUsed":["Coupon calculation order"]}}'
```

Response:

```json
{
  "provider": "local",
  "reflection": "...",
  "suggestedMemories": []
}
```

## POST /api/chat/generic

```json
{
  "projectId": "demo-shopease",
  "message": "Add coupon discount support"
}
```

Response:

```json
{
  "answer": "generic coding answer"
}
```

## POST /api/chat/memory

Creates a generated task record in local JSON storage. It does not auto-retain `memoryToSave`.

Response shape includes the Sprint 3 optional `memoryProvider` field:

```json
{
  "taskType": "feature",
  "answer": "...",
  "filesUsed": [],
  "memoriesUsed": [],
  "patchPreview": [],
  "testsToRun": [],
  "risks": [],
  "memoryToSave": [],
  "chunksUsed": [],
  "rawMemoriesUsed": [],
  "memoryProvider": "local"
}
```

## POST /api/chat/compare

```bash
curl -X POST http://localhost:4000/api/chat/compare \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","message":"Add coupon discount support"}'
```

Existing fields are unchanged. Sprint 3 adds optional `memoryProvider`.

```json
{
  "genericAnswer": "...",
  "memoryAnswer": "...",
  "chunksUsed": [],
  "memoriesUsed": [],
  "patchPreview": [],
  "memoryToSave": [],
  "memoryProvider": "local"
}
```

## GET /api/tasks/:projectId

```bash
curl http://localhost:4000/api/tasks/demo-shopease
```

Response:

```json
{
  "projectId": "demo-shopease",
  "tasks": []
}
```

## Hindsight Provider Notes

- Local provider is default: `MEMORY_PROVIDER=local`.
- Hindsight can be enabled with `MEMORY_PROVIDER=hindsight`, `HINDSIGHT_API_URL`, and `HINDSIGHT_API_KEY`.
- Bank IDs are generated as `{HINDSIGHT_PROJECT_PREFIX}:{projectId}`. Default example: `devcontext:demo-shopease`.
- Retain uses `POST /v1/default/banks/{bank_id}/memories`.
- Recall uses `POST /v1/default/banks/{bank_id}/memories/recall`.
- Reflect uses `POST /v1/default/banks/{bank_id}/reflect`.
- List attempts `GET /v1/default/banks/{bank_id}/memories/list`; if unavailable or empty, local seed/audit cache is returned.
- If Hindsight is missing config or a call fails, local fallback is used automatically.
