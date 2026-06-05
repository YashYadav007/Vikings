# API Contract

Base URL:

```text
http://localhost:4000
```

Existing Sprint 1-3 response shapes remain compatible. Sprint 4 adds public GitHub import and local RAG chunk debug APIs.

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
    "warnings": []
  }
}
```

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
  "chunks": []
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

Compare response keeps old fields and includes optional `memoryProvider`.

## Tasks

```bash
curl http://localhost:4000/api/tasks/demo-shopease
curl http://localhost:4000/api/tasks/:projectId
```

## Persistence

- Imported projects: `backend/.data/projects.json`
- Imported RAG chunks: `backend/.data/rag-chunks.json`
- Retained memories: `backend/.data/runtime-memories.json`
- Generated tasks: `backend/.data/tasks.json`

These are local MVP stores, not a database.
