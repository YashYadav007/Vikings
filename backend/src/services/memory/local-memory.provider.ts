import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { seedMemories } from "../../data/seed-memories";
import { Memory, MemoryDraft, ProjectId, ScoredMemory } from "../../types";
import { keywordScore } from "../../utils/score";
import { MemoryProvider } from "./memory-provider.interface";

export class LocalMemoryProvider implements MemoryProvider {
  readonly name = "local" as const;
  private readonly storagePath: string;

  constructor(storagePath = resolve(process.cwd(), ".data", "runtime-memories.json")) {
    this.storagePath = storagePath;
    this.ensureStorageFile();
  }

  async list(projectId: ProjectId): Promise<Memory[]> {
    return [...seedMemories, ...this.readRuntimeMemories()]
      .filter((memory) => memory.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async recall(projectId: ProjectId, query: string, limit = 5): Promise<ScoredMemory[]> {
    const memories = await this.list(projectId);

    return memories
      .map((memory) => ({
        ...memory,
        score: keywordScore(query, [
          memory.type,
          memory.title,
          memory.content,
          memory.relatedFiles.join(" "),
        ]),
      }))
      .filter((memory) => memory.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async retain(projectId: ProjectId, draft: MemoryDraft): Promise<Memory> {
    const memory: Memory = {
      ...draft,
      id: `memory-${randomUUID()}`,
      projectId,
      createdAt: new Date().toISOString(),
    };

    const runtimeMemories = this.readRuntimeMemories();
    runtimeMemories.push(memory);
    this.writeRuntimeMemories(runtimeMemories);

    return memory;
  }

  private ensureStorageFile(): void {
    const directory = dirname(this.storagePath);

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    if (!existsSync(this.storagePath)) {
      writeFileSync(this.storagePath, "[]\n", "utf8");
    }
  }

  private readRuntimeMemories(): Memory[] {
    this.ensureStorageFile();

    try {
      const content = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(content) as Memory[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeRuntimeMemories(memories: Memory[]): void {
    this.ensureStorageFile();
    writeFileSync(this.storagePath, `${JSON.stringify(memories, null, 2)}\n`, "utf8");
  }
}
