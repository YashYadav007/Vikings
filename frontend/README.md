# DevContext OS Frontend

Next.js 15 frontend for the DevContext OS Project Brain workspace.

## Run

```bash
npm install
npm run dev
```

The app expects the backend at:

```text
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

Routes implemented:

- `/`
- `/dashboard`
- `/import`
- `/projects/[projectId]`
- `/projects/[projectId]/task`
- `/projects/[projectId]/chat`
- `/projects/[projectId]/graph`
- `/projects/[projectId]/memory`
- `/projects/[projectId]/chunks`

The primary project workflow is `/projects/[projectId]/task`. It calls `POST /api/tasks/run` and shows agent provider, memory/RAG provider status, memory influence, patch preview, apply/PR result, incremental RAG update, and saved Hindsight memories. Compare mode remains available as `Compare Mode (Debug)`.

The memory timeline defaults to useful memories from the backend quality report and provides an all/debug toggle for duplicate or noisy memories.

The dashboard is the main way to reopen existing Project Brains. Cards show indexed time, chunk count, RAG provider, embedding provider/model, and a Sync Repo action. The import page is cache-first: repeat imports show “Project already indexed” and do not trigger new embeddings unless Force Re-index is clicked.

Dashboard cards also include a destructive Delete action for imported projects. The confirmation modal names the project/repo and asks “Delete this project and its indexed RAG data?” On success the card is removed immediately and cleanup warnings are shown. The project detail page exposes the same action in an advanced section and redirects back to dashboard.

Provider badges show:

- Agent: Gemini, OpenAI/LLM, Mock, or Claude Code
- Embeddings: Gemini, OpenAI, or Ollama
- RAG: pgvector or local
- Memory: Hindsight or local
- GitHub: mock, token, or unauthenticated

For the imported GitCode project (`github-yashyadav007-gitcode`), the task page shows a Curated Demo Task card. It can preview or run the GitHub token safety guard task through the real RAG + Hindsight + GitHub apply flow, then shows the PR result, incremental RAG update, retained Hindsight memory, and a demo proof panel.
