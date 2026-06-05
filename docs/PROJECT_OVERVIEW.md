# Project Overview

DevContext OS is a memory-powered AI coding workspace.

Every GitHub repository gets a persistent Project Brain:

- RAG stores static codebase knowledge: files, functions, APIs, schemas, README, and chunks.
- Hindsight stores evolving project journey: bugs, fixes, decisions, preferences, risks, and tasks.
- Graph visualizes the brain: Project -> Modules -> Files -> Tasks -> Memories -> Risks.
- Agent uses both RAG and memory to produce project-aware coding guidance.
- After every task, the agent proposes memories to retain.

Sprint 3 adds a real Hindsight HTTP provider behind the memory abstraction while preserving the local JSON fallback. Each project maps to one memory bank, such as `devcontext:demo-shopease`.

Still mocked or local:

- RAG is local keyword search.
- GitHub import is not implemented.
- pgvector is not implemented.
- Local JSON remains the fallback and audit cache for memory and generated tasks.
