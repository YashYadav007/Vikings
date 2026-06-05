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

Still mocked or local:

- RAG is local keyword search.
- GitHub import is public-repo only and capped at the top 40 useful files.
- pgvector is not implemented.
- Real PR creation requires `MOCK_GITHUB_WRITE=false`, `GITHUB_TOKEN`, and write access.
- Local JSON remains the fallback and audit cache for memory and generated tasks.
