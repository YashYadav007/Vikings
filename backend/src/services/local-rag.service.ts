import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seedChunks } from "../data/seed-chunks";
import { ProjectId, RagChunk, ScoredRagChunk } from "../types";
import { keywordScore, tokenize } from "../utils/score";

export class LocalRagService {
  private readonly storagePath: string;

  constructor(storagePath = resolve(process.cwd(), ".data", "rag-chunks.json")) {
    this.storagePath = storagePath;
    this.ensureStorageFile();
  }

  indexChunks(projectId: ProjectId, chunks: RagChunk[]): void {
    const existing = this.readImportedChunks().filter((chunk) => chunk.projectId !== projectId);
    this.writeImportedChunks([...existing, ...chunks]);
  }

  search(projectId: ProjectId, query: string, limit = 8): ScoredRagChunk[] {
    return this.listChunks(projectId)
      .map((chunk) => ({
        ...chunk,
        score: this.scoreChunk(query, chunk),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  listChunks(projectId: ProjectId): RagChunk[] {
    return [...seedChunks.map((chunk) => ({ ...chunk, source: "seed" as const })), ...this.readImportedChunks()].filter(
      (chunk) => chunk.projectId === projectId,
    );
  }

  clearProjectChunks(projectId: ProjectId): void {
    this.writeImportedChunks(this.readImportedChunks().filter((chunk) => chunk.projectId !== projectId));
  }

  clearProjectChunksWithCount(projectId: ProjectId): number {
    const before = this.readImportedChunks();
    const after = before.filter((chunk) => chunk.projectId !== projectId);
    this.writeImportedChunks(after);
    return before.length - after.length;
  }

  clearAllImportedChunks(): number {
    const before = this.readImportedChunks();
    this.writeImportedChunks([]);
    return before.length;
  }

  count(projectId: ProjectId): number {
    return this.listChunks(projectId).length;
  }

  private scoreChunk(query: string, chunk: RagChunk): number {
    const fields = [
      chunk.filePath,
      chunk.module,
      chunk.summary,
      chunk.content,
      chunk.symbols?.join(" ") ?? "",
      chunk.language ?? "",
    ];
    let score = keywordScore(query, fields);
    const terms = tokenize(query);
    const lowerPath = chunk.filePath.toLowerCase();
    const lowerModule = chunk.module.toLowerCase();

    for (const term of terms) {
      if (lowerPath.includes(term)) score += 3;
      if (lowerModule.includes(term)) score += 2;
    }

    return score;
  }

  private ensureStorageFile(): void {
    const directory = dirname(this.storagePath);
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
    if (!existsSync(this.storagePath)) writeFileSync(this.storagePath, "[]\n", "utf8");
  }

  private readImportedChunks(): RagChunk[] {
    this.ensureStorageFile();
    try {
      const parsed = JSON.parse(readFileSync(this.storagePath, "utf8")) as RagChunk[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeImportedChunks(chunks: RagChunk[]): void {
    this.ensureStorageFile();
    writeFileSync(this.storagePath, `${JSON.stringify(chunks, null, 2)}\n`, "utf8");
  }
}
