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
- `/projects/[projectId]/chat`
- `/projects/[projectId]/graph`
- `/projects/[projectId]/memory`
- `/projects/[projectId]/chunks`
