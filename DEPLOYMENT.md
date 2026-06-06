# Deployment Guide for Hindsight AI

This guide explains how to host the **Hindsight AI** project (Next.js frontend and Node.js backend).

---

## 1. Hosting the Frontend (Next.js)

The frontend is a standard Next.js application located in `/frontend`. The easiest and recommended way to host it is on **Vercel**.

### Steps for Vercel Deployment:
1. Install the Vercel CLI or connect your GitHub repository directly to Vercel.
2. Set the **Root Directory** of the project in Vercel to `frontend`.
3. Vercel will automatically detect Next.js and apply the correct build settings:
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
4. Set the following environment variables:
   - `NEXT_PUBLIC_API_URL`: The URL of your deployed backend (e.g., `https://hindsight-api.onrender.com`).
5. Click **Deploy**.

---

## 2. Hosting the Backend (Node.js)

The backend is a Node.js API server located in `/backend`. It can be hosted on platforms like **Render**, **Railway**, or **Fly.io**.

### Steps for Render Deployment:
1. Create a new **Web Service** on Render and connect your repository.
2. Set the **Root Directory** to `backend`.
3. Configure the following build settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build` (or `tsc` transpilation if applicable)
   - **Start Command**: `npm start`
4. Set the necessary environment variables:
   - `PORT`: `4000` (or let Render set it automatically)
   - `CODING_AGENT_PROVIDER`: `gemini`
   - `CODING_AGENT_MODEL`: `gemini-2.0-flash`
   - `GEMINI_API_KEY`: Your Gemini API key
   - `USE_MOCK_LLM`: `false`
   - `MEMORY_PROVIDER`: `hindsight` (or `local` if not using remote hindsight provider)
   - `HINDSIGHT_API_URL`: `https://api.hindsight.vectorize.io`
   - `HINDSIGHT_API_KEY`: Your Hindsight API key
   - `RAG_PROVIDER`: `pgvector` (or `local` for file-based fallback)
   - `SUPABASE_URL`: (Optional - for pgvector RAG)
   - `SUPABASE_SERVICE_ROLE_KEY`: (Optional - for pgvector RAG)
5. Click **Create Web Service**.

---

## 3. Environment Configurations

Make sure to rename/duplicate `.env.example` in both folders and fill out the values for production release.

- **Frontend**: `frontend/.env.local`
- **Backend**: `backend/.env`
