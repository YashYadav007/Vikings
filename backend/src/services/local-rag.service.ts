import { seedChunks } from "../data/seed-chunks";
import { ProjectId, ScoredRagChunk } from "../types";
import { keywordScore } from "../utils/score";

export class LocalRagService {
  search(projectId: ProjectId, query: string, limit = 4): ScoredRagChunk[] {
    // Future replacement point: Supabase pgvector semantic search over imported GitHub code chunks.
    return seedChunks
      .filter((chunk) => chunk.projectId === projectId)
      .map((chunk) => ({
        ...chunk,
        score: keywordScore(query, [chunk.filePath, chunk.module, chunk.summary, chunk.content]),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  count(projectId: ProjectId): number {
    return seedChunks.filter((chunk) => chunk.projectId === projectId).length;
  }
}
