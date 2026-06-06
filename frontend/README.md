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
