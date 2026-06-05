import { Memory, MemoryDraft, MemoryProviderStatus, MemoryReflection, ProjectId, ScoredMemory } from "../types";
import { getMemoryProviderStatus } from "./memory/memory-provider.factory";
import { MemoryProvider } from "./memory/memory-provider.interface";

export class LocalMemoryService {
  constructor(private readonly provider: MemoryProvider) {}

  get providerName() {
    return this.provider.name;
  }

  list(projectId: ProjectId): Promise<Memory[]> {
    return this.provider.list(projectId);
  }

  recall(projectId: ProjectId, query: string, limit = 5): Promise<ScoredMemory[]> {
    return this.provider.recall(projectId, query, limit);
  }

  retain(projectId: ProjectId, draft: MemoryDraft): Promise<Memory> {
    return this.provider.retain(projectId, draft);
  }

  reflect(projectId: ProjectId, query: string, context?: unknown): Promise<MemoryReflection> {
    return this.provider.reflect(projectId, query, context);
  }

  status(): MemoryProviderStatus {
    return getMemoryProviderStatus(this.provider.name);
  }

  async count(projectId: ProjectId): Promise<number> {
    return (await this.list(projectId)).length;
  }
}
