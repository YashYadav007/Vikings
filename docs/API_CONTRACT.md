# API Contract

Base URL:

```text
http://localhost:4000
```

Existing Sprint 1-5 response shapes remain compatible. Sprint 6 adds semantic RAG provider status, system status, and Hindsight verification APIs.

## Health And Projects

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/projects
curl http://localhost:4000/api/projects/demo-shopease
curl http://localhost:4000/api/projects/demo-shopease/memory
curl http://localhost:4000/api/projects/demo-shopease/graph
```

Imported projects use the same routes:

```bash
curl http://localhost:4000/api/projects/:projectId
curl http://localhost:4000/api/projects/:projectId/memory
curl http://localhost:4000/api/projects/:projectId/graph
```

## POST /api/repos/import

Imports a public GitHub repository into local project and RAG stores.

```bash
curl -X POST http://localhost:4000/api/repos/import \
  -H 'Content-Type: application/json' \
  -d '{"repoUrl":"https://github.com/octocat/Hello-World"}'
```

Supported URL formats:

- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`

Response:

```json
{
  "project": {
    "id": "github-octocat-hello-world",
    "name": "Hello-World",
    "repoUrl": "https://github.com/octocat/Hello-World",
    "owner": "octocat",
    "repoName": "Hello-World",
    "defaultBranch": "master",
    "description": "My first repository on GitHub!",
    "stack": [],
    "modules": [],
    "architecture": "...",
    "riskAreas": [],
    "lastTask": "Imported public GitHub repository",
    "memoryCount": 1,
    "chunkCount": 1,
    "createdAt": "2026-06-05T00:00:00.000Z",
    "updatedAt": "2026-06-05T00:00:00.000Z"
  },
  "importSummary": {
    "filesScanned": 1,
    "filesIndexed": 1,
    "chunksCreated": 1,
    "memoryRetained": true,
    "projectReused": false,
    "ragProvider": "local",
    "semanticIndex": false,
    "warnings": []
  }
}
```

Re-importing the same repo reuses the same project ID, refreshes metadata/chunks, and skips duplicate architecture memory. On the second import `importSummary.projectReused` is `true`; `memoryRetained` is `false` if the equivalent architecture memory already exists.

## RAG

Search works for seeded and imported projects.

```bash
curl -X POST http://localhost:4000/api/rag/search \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"github-octocat-hello-world","query":"README package source"}'
```

Response:

```json
{
  "chunks": [],
  "provider": "local",
  "semanticSearch": false
}
```

Provider status:

```bash
curl http://localhost:4000/api/rag/provider/status
```

Response:

```json
{
  "configuredProvider": "pgvector",
  "activeProvider": "local",
  "pgvectorConfigured": false,
  "supabaseConfigured": false,
  "embeddingConfigured": false,
  "fallbackMode": "local",
  "embeddingModel": "text-embedding-3-small"
}
```

Debug indexed chunks:

```bash
curl http://localhost:4000/api/rag/github-octocat-hello-world/chunks
```

Response:

```json
{
  "projectId": "github-octocat-hello-world",
  "chunks": [
    {
      "id": "...",
      "projectId": "...",
      "filePath": "README",
      "language": "readme",
      "module": "README",
      "summary": "...",
      "content": "...",
      "startLine": 1,
      "endLine": 2,
      "symbols": [],
      "source": "github"
    }
  ]
}
```

## Memory

```bash
curl http://localhost:4000/api/memory/provider/status
curl http://localhost:4000/api/memory/demo-shopease
curl http://localhost:4000/api/memory/:projectId
```

Verify provider retain/recall/reflect:

```bash
curl -X POST http://localhost:4000/api/memory/provider/verify \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease"}'
```

Response:

```json
{
  "provider": "local",
  "bankId": "devcontext:demo-shopease",
  "retainOk": true,
  "recallOk": true,
  "reflectOk": true,
  "recalledCount": 1,
  "fallbackUsed": false,
  "error": null
}
```

Recall:

```bash
curl -X POST http://localhost:4000/api/memory/recall \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","query":"coupon calculation order"}'
```

Retain:

```bash
curl -X POST http://localhost:4000/api/memory/retain \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","memory":{"type":"decision","title":"Coupon calculation order","content":"Apply coupon after quantity normalization","relatedFiles":["src/lib/cartService.ts"]}}'
```

Reflect:

```bash
curl -X POST http://localhost:4000/api/memory/reflect \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","query":"What should we remember after adding coupon support?","context":{"task":"Add coupon support","filesTouched":["src/lib/cartService.ts"]}}'
```

## Chat

Generic:

```bash
curl -X POST http://localhost:4000/api/chat/generic \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","message":"Add coupon discount support"}'
```

Memory-powered:

```bash
curl -X POST http://localhost:4000/api/chat/memory \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"github-octocat-hello-world","message":"Summarize the project architecture"}'
```

Compare:

```bash
curl -X POST http://localhost:4000/api/chat/compare \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"github-octocat-hello-world","message":"Summarize the project architecture"}'
```

Compare response keeps old fields and includes optional `memoryProvider`, `canExecute`, and `executeEndpoint`.

## Agent Execution

Generate plan and patch preview only. This endpoint does not write to GitHub.

```bash
curl -X POST http://localhost:4000/api/agent/execute \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","message":"Add coupon discount support"}'
```

Response:

```json
{
  "task": {
    "id": "task-id",
    "status": "patch_generated"
  },
  "plan": "...",
  "chunksUsed": [],
  "memoriesUsed": [],
  "patchPreview": [],
  "testsToRun": [],
  "risks": [],
  "requiresApproval": true
}
```

Apply after explicit approval:

```bash
curl -X POST http://localhost:4000/api/patches/task-id/apply \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","approve":true}'
```

Success:

```json
{
  "success": true,
  "task": {},
  "branchName": "devcontext/add-coupon-discount-support-12345678",
  "commitSha": "mock-commit",
  "prUrl": "https://github.com/mock/repo/pull/devcontext-mock",
  "memoryRetained": true
}
```

Safe failure:

```json
{
  "success": false,
  "reason": "GITHUB_TOKEN missing or repo not writable",
  "patchPreview": [],
  "task": {}
}
```

## Tasks

```bash
curl http://localhost:4000/api/tasks/demo-shopease
curl http://localhost:4000/api/tasks/:projectId
curl http://localhost:4000/api/tasks/:projectId/:taskId
```

## System Status

```bash
curl http://localhost:4000/api/system/status
```

Response:

```json
{
  "backend": "ok",
  "memory": {
    "provider": "local",
    "configuredProvider": "local",
    "hindsightConfigured": false,
    "fallbackMode": "local"
  },
  "rag": {
    "provider": "local",
    "configuredProvider": "local",
    "pgvectorConfigured": false,
    "supabaseConfigured": false,
    "embeddingConfigured": false,
    "fallbackMode": "local"
  },
  "llm": {
    "mockMode": true,
    "openaiConfigured": false
  },
  "github": {
    "tokenConfigured": false,
    "mockWrite": true
  },
  "deployment": {
    "nodeEnv": "development",
    "timestamp": "2026-06-05T00:00:00.000Z"
  }
}
```

## Persistence

- Imported projects: `backend/.data/projects.json`
- Imported RAG chunks: `backend/.data/rag-chunks.json`
- Semantic RAG chunks: Supabase `code_chunks` table when `RAG_PROVIDER=pgvector`
- Retained memories: `backend/.data/runtime-memories.json`
- Generated tasks: `backend/.data/tasks.json`

These are local MVP stores, not a database.

## Delete Imported Project

```bash
curl -X DELETE http://localhost:4000/api/projects/github-octocat-hello-world
```

Response:

```json
{
  "success": true,
  "deleted": {
    "project": true,
    "chunks": 1,
    "memories": 1,
    "tasks": 2
  }
}
```

Seed project protection:

```bash
curl -X DELETE http://localhost:4000/api/projects/demo-shopease
```

Returns `400`.

## Dev Reset

Enabled when `NODE_ENV !== "production"`.

Reset one project:

```bash
curl -X POST http://localhost:4000/api/dev/reset \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"github-octocat-hello-world"}'
```

Reset all imported/runtime local data:

```bash
curl -X POST http://localhost:4000/api/dev/reset \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Response:

```json
{
  "success": true,
  "cleared": {}
}
```

## Graph Deduplication

Graph output remains React Flow-compatible and now dedupes/groups:

- Module nodes by module ID/name.
- File nodes by path.
- Memory nodes by visible memory identity, with `data.count`.
- Repeated task labels, e.g. `Summarize the project architecture × 2`.
