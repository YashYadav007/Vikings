import { ChangedFile, IncrementalRagUpdateResult, ProjectBrain, RagChunk, ScoredRagChunk } from "../types";
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

  async searchProjectContext(
    project: ProjectBrain,
    message: string,
    limit = 8,
  ): Promise<{ chunks: ScoredRagChunk[]; fallbackUsed: boolean; query: string }> {
    const query = this.buildContextQuery(project, message);
    const chunks = await this.search(project.id, query, limit);

    if (chunks.length > 0) {
      return { chunks, fallbackUsed: false, query };
    }

    const listed = await this.listChunks(project.id);
    const fallbackChunks = this.pickFallbackChunks(listed, Math.max(3, Math.min(limit, 8))).map((chunk, index) => ({
      ...chunk,
      score: Math.max(0.001, 0.03 - index * 0.001),
    }));

    return {
      chunks: fallbackChunks,
      fallbackUsed: fallbackChunks.length > 0,
      query,
    };
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

  async deleteFileChunks(projectId: string, filePath: string): Promise<void> {
    try {
      await this.provider.deleteFileChunks(projectId, filePath);
    } catch (error) {
      console.warn(
        `RAG provider ${this.provider.name} failed during file delete; continuing local fallback delete. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    await this.localProvider.deleteFileChunks(projectId, filePath);
  }

  async upsertFileChunks(projectId: string, filePath: string, chunks: RagChunk[]): Promise<IncrementalRagUpdateResult> {
    try {
      const result = await this.provider.upsertFileChunks(projectId, filePath, chunks);
      if (this.provider.name !== "local") {
        await this.localProvider.upsertFileChunks(projectId, filePath, chunks);
      }
      return {
        provider: result.provider,
        semanticIndex: result.semanticIndex,
        filesUpdated: 1,
        filesDeleted: 0,
        chunksInserted: result.chunksIndexed,
        warnings: result.warnings,
      };
    } catch (error) {
      const warning = `RAG provider ${this.provider.name} failed during file upsert; used local RAG fallback. ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.warn(warning);
      const result = await this.localProvider.upsertFileChunks(projectId, filePath, chunks);
      return {
        provider: result.provider,
        semanticIndex: result.semanticIndex,
        filesUpdated: 1,
        filesDeleted: 0,
        chunksInserted: result.chunksIndexed,
        warnings: [warning, ...result.warnings],
      };
    }
  }

  async updateChangedFiles(projectId: string, changedFiles: ChangedFile[]): Promise<IncrementalRagUpdateResult> {
    try {
      const result = await this.provider.updateChangedFiles(projectId, changedFiles);
      if (this.provider.name !== "local") {
        await this.localProvider.updateChangedFiles(projectId, changedFiles);
      }
      return result;
    } catch (error) {
      const warning = `RAG provider ${this.provider.name} failed during incremental update; used local RAG fallback. ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.warn(warning);
      const result = await this.localProvider.updateChangedFiles(projectId, changedFiles);
      return {
        ...result,
        warnings: [warning, ...result.warnings],
      };
    }
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

  async listFileChunks(projectId: string, filePath: string): Promise<RagChunk[]> {
    return (await this.listChunks(projectId)).filter((chunk) => chunk.filePath === filePath);
  }

  private buildContextQuery(project: ProjectBrain, message: string): string {
    const lowerMessage = message.toLowerCase();
    const messageTerms = lowerMessage
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2)
      .slice(0, 16)
      .join(" ");
    const architectureTerms =
      /(architecture|explain|overview|summarize|summary|structure|modules|how.*work)/.test(lowerMessage)
        ? "README manifest background content script popup service worker architecture modules package config entrypoint"
        : "";
    const moduleContext = project.modules.map((module) => `${module.name} ${module.summary}`).join(" ");

    return [
      message,
      project.name,
      project.architecture ?? "",
      project.stack.join(" "),
      moduleContext,
      messageTerms,
      architectureTerms,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private pickFallbackChunks(chunks: RagChunk[], limit: number): RagChunk[] {
    const priority = (chunk: RagChunk): number => {
      const path = chunk.filePath.toLowerCase();
      if (/(^|\/)readme(\.md)?$/i.test(path)) return 100;
      if (path.endsWith("package.json")) return 95;
      if (path.includes("manifest")) return 90;
      if (path.includes("background")) return 85;
      if (path.includes("content")) return 84;
      if (path.includes("popup")) return 83;
      if (path.includes("config")) return 75;
      return 10;
    };

    return [...chunks].sort((a, b) => priority(b) - priority(a) || a.filePath.localeCompare(b.filePath)).slice(0, limit);
  }
}
