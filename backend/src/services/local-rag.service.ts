import { RagChunk, ScoredRagChunk } from "../types";
import { EmbeddingService } from "./embedding.service";
import { LocalRagProvider } from "./rag/local-rag.provider";
import { createRagProvider, getRagProviderStatus, RagProviderStatus } from "./rag/rag-provider.factory";
import { IndexChunksResult, RagProvider } from "./rag/rag-provider.interface";
import { SupabaseService } from "./supabase.service";

export class LocalRagService {
  private readonly provider: RagProvider;

  constructor(
    private readonly localProvider = new LocalRagProvider(),
    private readonly supabaseService = new SupabaseService(),
    private readonly embeddingService = new EmbeddingService(),
  ) {
    this.provider = createRagProvider(localProvider, supabaseService, embeddingService);
  }

  get providerName(): "local" | "pgvector" {
    return this.provider.name;
  }

  status(): RagProviderStatus {
    return getRagProviderStatus(this.provider.name, this.supabaseService, this.embeddingService);
  }

  async indexChunks(projectId: string, chunks: RagChunk[]): Promise<IndexChunksResult> {
    try {
      return await this.provider.indexChunks(projectId, chunks);
    } catch (error) {
      const warning = `RAG provider ${this.provider.name} failed during index; used local RAG fallback. ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.warn(warning);
      const result = await this.localProvider.indexChunks(projectId, chunks);
      return { ...result, warnings: [warning, ...result.warnings] };
    }
  }

  async search(projectId: string, query: string, limit = 8): Promise<ScoredRagChunk[]> {
    try {
      return await this.provider.search(projectId, query, { topK: limit, includeContent: true });
    } catch (error) {
      console.warn(`RAG provider ${this.provider.name} failed during search; used local RAG fallback. ${error instanceof Error ? error.message : String(error)}`);
      return this.localProvider.search(projectId, query, { topK: limit, includeContent: true });
    }
  }

  async listChunks(projectId: string): Promise<RagChunk[]> {
    try {
      return await this.provider.listChunks(projectId);
    } catch (error) {
      console.warn(`RAG provider ${this.provider.name} failed during list; used local RAG fallback. ${error instanceof Error ? error.message : String(error)}`);
      return this.localProvider.listChunks(projectId);
    }
  }

  async clearProjectChunks(projectId: string): Promise<void> {
    try {
      await this.provider.clearProjectChunks(projectId);
    } catch (error) {
      console.warn(`RAG provider ${this.provider.name} failed during clear; continuing local fallback clear. ${error instanceof Error ? error.message : String(error)}`);
    }
    await this.localProvider.clearProjectChunks(projectId);
  }

  async clearProjectChunksWithCount(projectId: string): Promise<number> {
    const before = (await this.localProvider.listChunks(projectId)).filter((chunk) => chunk.source !== "seed").length;
    await this.clearProjectChunks(projectId);
    return before;
  }

  async clearAllImportedChunks(): Promise<number> {
    return this.localProvider.clearAllImportedChunks();
  }

  async count(projectId: string): Promise<number> {
    return (await this.listChunks(projectId)).length;
  }
}
