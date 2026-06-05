import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seedChunks } from "../../data/seed-chunks";
import { RagChunk, ScoredRagChunk } from "../../types";
import { keywordScore, tokenize } from "../../utils/score";
import { IndexChunksResult, RagProvider } from "./rag-provider.interface";

export class LocalRagProvider implements RagProvider {
  readonly name = "local" as const;
  private readonly storagePath: string;

  constructor(storagePath = resolve(process.cwd(), ".data", "rag-chunks.json")) {
    this.storagePath = storagePath;
    this.ensureStorageFile();
  }

  async indexChunks(projectId: string, chunks: RagChunk[]): Promise<IndexChunksResult> {
    const existing = this.readImportedChunks().filter((chunk) => chunk.projectId !== projectId);
    this.writeImportedChunks([...existing, ...chunks]);
    return {
      provider: "local",
      semanticIndex: false,
      chunksIndexed: chunks.length,
      warnings: [],
    };
  }

  async search(projectId: string, query: string, options?: { topK?: number; includeContent?: boolean }): Promise<ScoredRagChunk[]> {
    const topK = options?.topK ?? 8;
    return (await this.listChunks(projectId))
      .map((chunk) => ({
        ...chunk,
        content: options?.includeContent === false ? "" : chunk.content,
        score: this.scoreChunk(query, chunk),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async listChunks(projectId: string): Promise<RagChunk[]> {
    return [...seedChunks.map((chunk) => ({ ...chunk, source: "seed" as const })), ...this.readImportedChunks()].filter(
      (chunk) => chunk.projectId === projectId,
    );
  }

  async clearProjectChunks(projectId: string): Promise<void> {
    this.writeImportedChunks(this.readImportedChunks().filter((chunk) => chunk.projectId !== projectId));
  }

  clearProjectChunksWithCount(projectId: string): number {
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
