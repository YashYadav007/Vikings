# Project Overview

DevContext OS is a memory-powered AI coding workspace.

Every GitHub repository gets a persistent Project Brain:

- RAG stores static codebase knowledge: files, functions, APIs, schemas, README, and chunks.
- Hindsight stores evolving project journey: bugs, fixes, decisions, preferences, risks, and tasks.
- Graph visualizes the brain: Project -> Modules -> Files -> Tasks -> Memories -> Risks.
- Agent uses both RAG and memory to produce project-aware coding guidance.
- After every task, the agent proposes memories to retain.

Sprint 3 adds a real Hindsight HTTP provider behind the memory abstraction while preserving the local JSON fallback. Each project maps to one memory bank, such as `devcontext:demo-shopease`.

Sprint 4 adds public GitHub repository import. DevContext OS can now fetch a public repo, filter useful files, chunk code, persist a local project brain, index chunks for keyword RAG, and retain an initial architecture memory.

Sprint 5 adds safe autonomous execution. The agent can generate a plan and patch preview from RAG + memory, then waits for explicit approval before applying changes to a new GitHub branch and opening a PR. Local demos use mock GitHub writes by default.

Sprint 6 upgrades RAG from prototype keyword search to a provider-backed layer. Local keyword RAG remains the fallback, while `RAG_PROVIDER=pgvector` enables Supabase Postgres + pgvector semantic search with hosted embeddings. Hindsight verification and reflect behavior are hardened for hosted demos.

Sprint 7 adds the production learning loop. Initial import indexes the selected repo files, while approved task apply updates only changed file chunks in RAG. Hindsight stores concise task learning, decisions, risks, and follow-ups, never raw full code. Future agent plans recall those memories before patch generation and visibly include memory influence.

The current architecture uses a coding-agent provider abstraction. The LLM provider is the hosted-demo target and receives Hindsight memories, learning summary, and RAG chunks before generating a structured patch preview. The mock provider keeps local no-key development deterministic. Compare mode is retained as a debug view, while `/api/tasks/run` is the primary product workflow.

Sprint 7.2 adds a Hindsight memory quality gate. DevContext stores concise durable learning only and rejects duplicate decisions, generic assistant event logs, standalone RAG indexing logs, repeated safety boilerplate, and low-value task restatements. Learning summary and agent recall use the filtered useful memory view.

The current low-cost hosted target is Gemini-first: `CODING_AGENT_PROVIDER=gemini` for the coding agent and `EMBEDDING_PROVIDER=gemini` for pgvector embeddings. OpenAI remains supported. Imported projects are cache-first: dashboard cards open existing Project Brains without re-importing, repeat imports return `cacheHit: true`, and re-embedding only happens on explicit Sync or Force Re-index. File hashes prevent unchanged files from being embedded again, and task apply continues to update only touched files.

The curated GitCode demo task is a reliable presentation path when live LLM quota is unavailable. It is not a fake response: it still recalls Hindsight, searches/lists RAG, generates a deterministic token-safety patch for extension code, applies through GitHub write/mock PR flow, updates only changed RAG files, and saves quality-gated Hindsight learning.

Still mocked or local:

- RAG defaults to local keyword search unless Supabase pgvector and Gemini/OpenAI embeddings are configured.
- GitHub import is public-repo only and capped at the top 40 useful files.
- pgvector is implemented but optional; local fallback keeps the backend usable without keys.
- Real PR creation requires `MOCK_GITHUB_WRITE=false`, `GITHUB_TOKEN`, and write access.
- Local JSON remains the fallback and audit cache for memory and generated tasks.
