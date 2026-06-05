import { Memory, MemoryDraft, ProjectId, ScoredMemory } from "../../types";
import { MemoryProvider } from "./memory-provider.interface";

export interface HindsightProviderConfig {
  apiUrl?: string;
  apiKey?: string;
}

export class HindsightMemoryProvider implements MemoryProvider {
  readonly name = "hindsight" as const;

  constructor(private readonly config: HindsightProviderConfig) {}

  async list(_projectId: ProjectId): Promise<Memory[]> {
    this.assertConfigured();
    // TODO: Plug in Hindsight list/reflect API or SDK call when endpoint contract is finalized.
    throw new Error("Hindsight memory list is not implemented yet.");
  }

  async recall(_projectId: ProjectId, _query: string, _limit = 5): Promise<ScoredMemory[]> {
    this.assertConfigured();
    // TODO: Plug in Hindsight recall API or SDK call when endpoint contract is finalized.
    throw new Error("Hindsight memory recall is not implemented yet.");
  }

  async retain(_projectId: ProjectId, _memory: MemoryDraft): Promise<Memory> {
    this.assertConfigured();
    // TODO: Plug in Hindsight retain API or SDK call when endpoint contract is finalized.
    throw new Error("Hindsight memory retain is not implemented yet.");
  }

  private assertConfigured(): void {
    if (!this.config.apiUrl || !this.config.apiKey) {
      throw new Error("Hindsight provider is missing HINDSIGHT_API_URL or HINDSIGHT_API_KEY.");
    }
  }
}
