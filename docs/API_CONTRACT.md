# API Contract

Base URL:

```text
http://localhost:4000
```

## GET /health

Returns service status.

```json
{
  "status": "ok",
  "service": "devcontext-os-backend"
}
```

## GET /api/projects

Returns demo projects.

## GET /api/projects/demo-shopease

Returns the ShopEase project brain summary with `id`, `name`, `repoUrl`, `stack`, `modules`, `memoryCount`, `chunkCount`, `riskAreas`, and `lastTask`.

## GET /api/projects/demo-shopease/memory

Returns chronological memory timeline. Existing frontend shape is unchanged.

```json
{
  "memories": [
    {
      "id": "memory-cart-quantity-bug",
      "projectId": "demo-shopease",
      "type": "bug",
      "title": "Cart quantity bug",
      "content": "...",
      "relatedFiles": ["src/lib/cartService.ts"],
      "createdAt": "2026-05-01T09:00:00.000Z"
    }
  ]
}
```

## GET /api/projects/demo-shopease/graph

Returns React Flow-compatible graph data.

```json
{
  "nodes": [
    {
      "id": "project-demo-shopease",
      "type": "project",
      "data": { "label": "ShopEase" },
      "position": { "x": 400, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "edge-project-cart",
      "source": "project-demo-shopease",
      "target": "module-cart",
      "label": "has module"
    }
  ]
}
```

## POST /api/rag/search

Request:

```json
{
  "projectId": "demo-shopease",
  "query": "Add coupon discount support"
}
```

Response:

```json
{
  "chunks": [
    {
      "id": "chunk-cart-service",
      "projectId": "demo-shopease",
      "filePath": "src/lib/cartService.ts",
      "module": "Cart",
      "summary": "...",
      "content": "...",
      "score": 8
    }
  ]
}
```

## POST /api/memory/recall

Request:

```json
{
  "projectId": "demo-shopease",
  "query": "Add coupon discount support"
}
```

Uses the configured memory provider. `MEMORY_PROVIDER=local` is the default.

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

Response:

```json
{
  "memories": [
    {
      "id": "memory-coupon-order",
      "type": "decision",
      "title": "Coupon calculation order",
      "content": "...",
      "relatedFiles": ["src/lib/cartService.ts"],
      "score": 4
    }
  ]
}
```

## POST /api/chat/generic

Request:

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

Request:

```json
{
  "projectId": "demo-shopease",
  "message": "Add coupon discount support"
}
```

This creates a generated task record in local JSON storage. It does not auto-retain `memoryToSave`.

Response shape:

```json
{
  "taskType": "feature",
  "answer": "...",
  "filesUsed": [{ "path": "src/lib/cartService.ts", "reason": "..." }],
  "memoriesUsed": [{ "type": "bug", "title": "Cart quantity bug", "content": "..." }],
  "patchPreview": [{ "filePath": "src/lib/cartService.ts", "changeSummary": "...", "diff": "..." }],
  "testsToRun": ["cart total test"],
  "risks": ["Checkout total calculation is sensitive to operation order"],
  "memoryToSave": [{ "type": "decision", "title": "...", "content": "...", "relatedFiles": [] }],
  "chunksUsed": [],
  "rawMemoriesUsed": []
}
```

## POST /api/chat/compare

Request:

```json
{
  "projectId": "demo-shopease",
  "message": "Add coupon discount support"
}
```

This creates a generated task record in local JSON storage. Existing compare response shape is unchanged.

Response shape:

```json
{
  "genericAnswer": "...",
  "memoryAnswer": "...",
  "chunksUsed": [],
  "memoriesUsed": [],
  "patchPreview": [],
  "memoryToSave": []
}
```

## POST /api/memory/retain

Request:

```json
{
  "projectId": "demo-shopease",
  "memory": {
    "type": "decision",
    "title": "Coupon calculation order",
    "content": "Apply coupon after quantity normalization",
    "relatedFiles": ["src/lib/cartService.ts"]
  }
}
```

Retained memories persist through the local provider in `backend/.data/runtime-memories.json`.

## GET /api/tasks/:projectId

Returns generated chat tasks for a project.

```bash
curl http://localhost:4000/api/tasks/demo-shopease
```

Response:

```json
{
  "projectId": "demo-shopease",
  "tasks": [
    {
      "id": "task-generated",
      "projectId": "demo-shopease",
      "message": "Add coupon discount support",
      "taskType": "feature",
      "createdAt": "2026-06-05T00:00:00.000Z",
      "chunksUsedCount": 2,
      "memoriesUsedCount": 2,
      "patchPreview": [],
      "status": "generated"
    }
  ]
}
```

## Provider Notes

- `MEMORY_PROVIDER=local` is the default and uses seeded memories plus local JSON retained memories.
- `MEMORY_PROVIDER=hindsight` is scaffolded for a future integration.
- If Hindsight is requested without required env vars and `HINDSIGHT_FALLBACK_MODE=local`, the backend logs a warning and uses local memory.
- `backend/dist` is generated by `npm run build` and is ignored by source control.

Response:

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
