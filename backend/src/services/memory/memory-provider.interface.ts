import { Memory, MemoryDraft, MemoryReflection, ProjectId, ScoredMemory } from "../../types";

export type MemoryProviderName = "local" | "hindsight";

export interface MemoryProvider {
  readonly name: MemoryProviderName;
  recall(projectId: ProjectId, query: string, limit?: number): Promise<ScoredMemory[]>;
  retain(projectId: ProjectId, memory: MemoryDraft): Promise<Memory>;
  list(projectId: ProjectId): Promise<Memory[]>;
  reflect(projectId: ProjectId, query: string, context?: unknown): Promise<MemoryReflection>;
}
