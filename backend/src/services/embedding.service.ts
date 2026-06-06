import { RagChunk } from "../types";
import { createEmbeddingProvider, getEmbeddingProviderStatus } from "./embeddings/embedding-provider.factory";
import { EmbeddingProvider, EmbeddingProviderStatus } from "./embeddings/embedding-provider.interface";

const MAX_EMBED_INPUT_CHARS = 8000;

export class EmbeddingService {
  private readonly activeProvider: EmbeddingProvider;

  constructor() {
    this.activeProvider = createEmbeddingProvider();
  }

  get provider(): string {
    return this.activeProvider.name;
  }

  get model(): string {
    return this.activeProvider.model;
  }

  get dimensions(): number {
    return this.activeProvider.dimensions;
  }

  isEmbeddingConfigured(): boolean {
    return this.activeProvider.isConfigured();
  }

  status(): EmbeddingProviderStatus {
    return getEmbeddingProviderStatus(this.activeProvider);
  }

  async embedText(text: string): Promise<number[]> {
    const embedding = await this.activeProvider.embedText(text.slice(0, MAX_EMBED_INPUT_CHARS));
    if (embedding.length !== this.dimensions) {
      throw new Error(
        `Embedding dimension mismatch: provider returned ${embedding.length}, expected ${this.dimensions}. Check EMBEDDING_DIMENSIONS and pgvector table dimensions.`,
      );
    }
    return embedding;
  }

  embedChunk(chunk: RagChunk): Promise<number[]> {
    return this.embedText(
      [
        `File: ${chunk.filePath}`,
        `Module: ${chunk.module}`,
        `Language: ${chunk.language ?? "unknown"}`,
        `Summary: ${chunk.summary}`,
        `Symbols: ${(chunk.symbols ?? []).join(", ")}`,
        "Content:",
        chunk.content,
      ].join("\n"),
    );
  }

  embedQuery(query: string): Promise<number[]> {
    return this.embedText(query);
  }
}
