# API Contract

Base URL:

```text
http://localhost:4000
```

Existing response shapes remain compatible. New provider/cache fields are additive: Gemini/OpenAI agent metadata, embedding metadata, cache hit status, and sync/reindex counters.

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
  -d '{"repoUrl":"https://github.com/octocat/Hello-World","forceReindex":false}'
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
    "updatedAt": "2026-06-05T00:00:00.000Z",
    "indexedAt": "2026-06-05T00:00:00.000Z",
    "lastIndexedCommitSha": "abc123",
    "ragProvider": "pgvector",
    "semanticIndex": true,
    "embeddingProvider": "gemini",
    "embeddingModel": "gemini-embedding-2",
    "embeddingDimensions": 1536
  },
  "importSummary": {
    "filesScanned": 1,
    "filesIndexed": 1,
    "chunksCreated": 1,
    "memoryRetained": true,
    "memoryProvider": "local",
    "memoryFallbackUsed": false,
    "projectReused": false,
    "cacheHit": false,
    "reindexed": false,
    "embeddingsGenerated": 1,
    "filesSkippedUnchanged": 0,
    "filesReindexed": 1,
    "ragProvider": "local",
    "semanticIndex": false,
    "embeddingProvider": "gemini",
    "embeddingModel": "gemini-embedding-2",
    "embeddingDimensions": 1536,
    "indexedAt": "2026-06-05T00:00:00.000Z",
    "lastIndexedCommitSha": "abc123",
    "warnings": []
  }
}
```

`project.architecture` and the initial architecture memory use provider-aware wording. pgvector imports say `Indexed X semantic RAG chunks using Supabase pgvector`; local imports say `Indexed X local RAG chunks for keyword search`.

Re-importing the same repo reuses the same project ID. If `forceReindex` is not true, it returns a cache hit immediately: `cacheHit: true`, `reindexed: false`, `embeddingsGenerated: 0`, and no duplicate architecture memory. Use `forceReindex: true` to explicitly refresh.

## POST /api/repos/:projectId/sync

Explicitly checks the latest GitHub branch and updates only changed/deleted file chunks.

```bash
curl -X POST http://localhost:4000/api/repos/github-owner-repo/sync \
  -H 'Content-Type: application/json' \
  -d '{"forceReindex":false}'
```

Response:

```json
{
  "projectId": "github-owner-repo",
  "syncSkipped": true,
  "cacheHit": true,
  "changedFiles": [],
  "filesReindexed": 0,
  "filesSkippedUnchanged": 40,
  "embeddingsGenerated": 0,
  "ragProvider": "pgvector",
  "semanticIndex": true,
  "embeddingProvider": "gemini",
  "embeddingModel": "gemini-embedding-2",
  "warnings": []
}
```

## DELETE /api/projects/:projectId

Deletes an imported project and clears local/cache state.

```bash
curl -X DELETE http://localhost:4000/api/projects/github-owner-repo
```

Response:

```json
{
  "success": true,
  "projectId": "github-owner-repo",
  "deleted": {
    "project": true,
    "ragChunks": 24,
    "tasks": 3,
    "localMemories": 4,
    "cache": true
  },
  "hindsight": {
    "provider": "hindsight",
    "remoteDeleteSupported": false,
    "action": "remote memories not deleted; project will no longer be recalled locally after the project record is gone"
  },
  "warnings": [
    "Hindsight remote delete is not supported; project data was removed locally and from RAG. Use a new HINDSIGHT_DEMO_SESSION_ID for clean demo memory."
  ]
}
```

`demo-shopease` is protected and returns `400` unless `allowSeedDelete=true` is supplied in non-production dev mode. Remote Hindsight memories are not deleted unless the provider adds a safe delete API; deleted projects disappear from dashboard and normal project flows.

## POST /api/demo/gitcode-token-safety

Runs the curated GitCode hackathon demo task through the real DevContext flow: Hindsight recall, RAG search/list, deterministic patch preview, GitHub branch/commit/PR workflow, incremental RAG update, and Hindsight memory retain.

```bash
curl -X POST http://localhost:4000/api/demo/gitcode-token-safety \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"github-yashyadav007-gitcode","mode":"safe-auto"}'
```

Request:

```json
{
  "projectId": "github-yashyadav007-gitcode",
  "mode": "safe-auto"
}
```

`mode` defaults to `safe-auto`; use `preview-only` to show the patch without applying.

Response includes the same task-run evidence fields:

```json
{
  "success": true,
  "projectId": "github-yashyadav007-gitcode",
  "agentProvider": "curated-demo",
  "agentModel": "gitcode-token-safety-demo",
  "memoryProvider": "hindsight",
  "ragProvider": "pgvector",
  "memoryInfluence": "...",
  "memoriesUsed": [],
  "chunksUsed": [],
  "patchPreview": [],
  "applyResult": {
    "success": true,
    "branchName": "devcontext/gitcode-token-safety-abc123",
    "prUrl": "..."
  },
  "incrementalRagUpdate": {
    "filesUpdated": 2,
    "chunksInserted": 2
  },
  "hindsightRetention": {}
}
```

With `MOCK_GITHUB_WRITE=true`, PR creation is simulated. With `MOCK_GITHUB_WRITE=false`, `GITHUB_TOKEN`, and write access, the same endpoint creates a real branch and PR.

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
  "embeddingProvider": "gemini",
  "fallbackMode": "local",
  "embeddingModel": "gemini-embedding-2",
  "embeddingDimensions": 1536
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

Hindsight metadata is provider-normalized before retain: arrays/objects such as `relatedFiles` and `tags` are stringified for Hindsight, while DevContext API responses keep `relatedFiles` as arrays. If Hindsight retain fails and local fallback succeeds, responses may include `provider: "local"`, `fallbackUsed: true`, and `fallbackReason: "Hindsight retain failed"`.

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

Sprint 6.1 also adds optional RAG metadata without removing existing fields:

```json
{
  "ragProvider": "pgvector",
  "semanticSearch": true,
  "ragFallbackUsed": false
}
```

For architecture/explain prompts, chat enriches the RAG query and falls back to top indexed chunks when provider search returns no direct matches.

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
  "memoryRetained": true,
  "memoryProvider": "hindsight",
  "memoryFallbackUsed": false,
  "incrementalRagUpdate": {
    "provider": "pgvector",
    "semanticIndex": true,
    "filesUpdated": 1,
    "filesDeleted": 0,
    "chunksInserted": 3,
    "warnings": []
  }
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

Run the primary coding-agent workflow:

```bash
curl -X POST http://localhost:4000/api/tasks/run \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"demo-shopease","message":"Improve README setup instructions","mode":"safe-auto"}'
```

Response includes existing task fields plus provider and learning-loop evidence:

```json
{
  "agentProvider": "llm",
  "memoryProvider": "hindsight",
  "memoryFallbackUsed": false,
  "ragProvider": "pgvector",
  "semanticSearch": true,
  "memoryInfluence": "...",
  "memoriesUsed": [],
  "chunksUsed": [],
  "patchPreview": [],
  "applyResult": {},
  "incrementalRagUpdate": {},
  "savedMemories": []
}
```

## Learning Loop

Approved patch apply updates only changed file chunks in RAG. It does not re-index the full repo. Hindsight receives concise durable learning, not raw full code.

Learning summary:

```bash
curl http://localhost:4000/api/memory/:projectId/learning-summary
```

Response:

```json
{
  "projectId": "demo-shopease",
  "provider": "local",
  "memoryCount": 10,
  "usefulCount": 8,
  "noisyCount": 1,
  "duplicateCount": 1,
  "recentTasks": [],
  "decisions": [],
  "risks": [],
  "preferences": [],
  "followUps": [],
  "topFilesMentioned": []
}
```

Quality report:

```bash
curl http://localhost:4000/api/memory/:projectId/quality-report
```

Response:

```json
{
  "projectId": "demo-shopease",
  "provider": "hindsight",
  "totalMemories": 12,
  "duplicateGroups": [],
  "noisyMemories": [],
  "recommendedKeep": [],
  "recommendedArchive": [],
  "latestArchitectureMemory": null
}
```

The memory quality gate keeps durable task, decision, risk, preference, follow-up, and architecture memories. It rejects generic assistant event logs, standalone RAG indexing logs, duplicate decisions, and low-value task restatements.

File-scoped chunks:

```bash
curl 'http://localhost:4000/api/rag/:projectId/file-chunks?filePath=README.md'
```

Response:

```json
{
  "projectId": "demo-shopease",
  "filePath": "README.md",
  "chunks": []
}
```

Future `POST /api/agent/execute` plans include `Memory influence` when recalled memories exist.

`POST /api/agent/execute` now uses the same coding-agent provider as `/api/tasks/run`, but remains preview-oriented for existing frontend compatibility.

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

## Context Debug

```bash
curl http://localhost:4000/api/projects/:projectId/context-debug
```

Response:

```json
{
  "projectId": "github-owner-repo",
  "projectArchitecture": "...",
  "ragProviderStatus": {},
  "chunkCountFromProject": 44,
  "chunkCountFromProvider": 44,
  "topChunksPreview": [],
  "memoryProvider": "hindsight",
  "recalledArchitectureMemories": []
}
```

This endpoint is for local/demo debugging and helps confirm chat, graph, and memory are looking at the expected provider context.

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
