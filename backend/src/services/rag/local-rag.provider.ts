import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seedChunks } from "../../data/seed-chunks";
import { ChangedFile, IncrementalRagUpdateResult, RagChunk, ScoredRagChunk } from "../../types";
import { keywordScore, tokenize } from "../../utils/score";
import { IndexChunksResult, RagProvider } from "./rag-provider.interface";
import { chunkChangedFile } from "./rag-chunking";

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

  async deleteFileChunks(projectId: string, filePath: string): Promise<void> {
    this.writeImportedChunks(this.readImportedChunks().filter((chunk) => chunk.projectId !== projectId || chunk.filePath !== filePath));
  }

  async upsertFileChunks(projectId: string, filePath: string, chunks: RagChunk[]): Promise<IndexChunksResult> {
    const existing = this.readImportedChunks().filter((chunk) => chunk.projectId !== projectId || chunk.filePath !== filePath);
    this.writeImportedChunks([...existing, ...chunks]);
    return {
      provider: "local",
      semanticIndex: false,
      chunksIndexed: chunks.length,
      warnings: [],
    };
  }

  async updateChangedFiles(projectId: string, changedFiles: ChangedFile[]): Promise<IncrementalRagUpdateResult> {
    const warnings: string[] = [];
    let filesUpdated = 0;
    let filesDeleted = 0;
    let chunksInserted = 0;

    for (const file of changedFiles) {
      if (file.status === "deleted") {
        await this.deleteFileChunks(projectId, file.filePath);
        filesDeleted += 1;
        continue;
      }

      if (!file.content) {
        warnings.push(`No newContent available for ${file.filePath}; skipped incremental RAG update.`);
        continue;
      }

      const chunks = chunkChangedFile(projectId, file);
      await this.upsertFileChunks(projectId, file.filePath, chunks);
      filesUpdated += 1;
      chunksInserted += chunks.length;
    }

    return {
      provider: "local",
      semanticIndex: false,
      filesUpdated,
      filesDeleted,
      chunksInserted,
      warnings,
    };
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
