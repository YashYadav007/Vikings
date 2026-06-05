import { Memory, MemoryDraft, ProjectId, ScoredMemory } from "../types";
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

  async count(projectId: ProjectId): Promise<number> {
    return (await this.list(projectId)).length;
  }
}
