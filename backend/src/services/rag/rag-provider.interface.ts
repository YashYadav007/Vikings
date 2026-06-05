import { RagChunk, ScoredRagChunk } from "../../types";

export interface IndexChunksResult {
  provider: "local" | "pgvector";
  semanticIndex: boolean;
  chunksIndexed: number;
  warnings: string[];
}

export interface RagProvider {
  readonly name: "local" | "pgvector";

  indexChunks(projectId: string, chunks: RagChunk[]): Promise<IndexChunksResult>;

  search(
    projectId: string,
    query: string,
    options?: {
      topK?: number;
      includeContent?: boolean;
    },
  ): Promise<ScoredRagChunk[]>;

  listChunks(projectId: string): Promise<RagChunk[]>;

  clearProjectChunks(projectId: string): Promise<void>;
}
