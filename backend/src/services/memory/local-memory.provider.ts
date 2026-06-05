import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { seedMemories } from "../../data/seed-memories";
import { Memory, MemoryDraft, MemoryReflection, ProjectId, ScoredMemory } from "../../types";
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
    return this.dedupeMemories([...seedMemories, ...this.readRuntimeMemories()])
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
    const existing = (await this.list(projectId)).find((memory) => this.isEquivalentMemory(memory, draft));
    if (existing) {
      return { ...existing, duplicate: true } as Memory;
    }

    const memory: Memory = {
      ...draft,
      id: `memory-${randomUUID()}`,
      projectId,
      createdAt: new Date().toISOString(),
    };

    const runtimeMemories = this.dedupeMemories(this.readRuntimeMemories());
    runtimeMemories.push(memory);
    this.writeRuntimeMemories(runtimeMemories);

    return memory;
  }

  clearProject(projectId: ProjectId): number {
    const before = this.readRuntimeMemories();
    const after = before.filter((memory) => memory.projectId !== projectId);
    this.writeRuntimeMemories(after);
    return before.length - after.length;
  }

  clearAllRuntime(): number {
    const before = this.readRuntimeMemories();
    this.writeRuntimeMemories([]);
    return before.length;
  }

  async reflect(projectId: ProjectId, query: string, context?: unknown): Promise<MemoryReflection> {
    const memories = await this.recall(projectId, query);
    const suggestedMemories = this.buildSuggestedMemories(context);
    const memoryTitles = memories.length > 0 ? memories.map((memory) => memory.title).join(", ") : "no matching memories";

    return {
      provider: "local",
      reflection: `Local reflection for ${projectId}: ${query}. Relevant memory signals: ${memoryTitles}. Suggested memories are deterministic and should be reviewed before retain.`,
      suggestedMemories,
    };
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
    writeFileSync(this.storagePath, `${JSON.stringify(this.dedupeMemories(memories), null, 2)}\n`, "utf8");
  }

  private buildSuggestedMemories(context: unknown): MemoryDraft[] {
    const contextRecord = typeof context === "object" && context !== null ? (context as Record<string, unknown>) : {};
    const filesTouched = Array.isArray(contextRecord.filesTouched)
      ? contextRecord.filesTouched.filter((file): file is string => typeof file === "string")
      : [];
    const task = typeof contextRecord.task === "string" ? contextRecord.task : "Memory reflection";

    return [
      {
        type: "decision",
        title: "Task reflection",
        content: `After "${task}", retain only durable implementation decisions, risks, and follow-ups. Do not store secrets or temporary debug details.`,
        relatedFiles: filesTouched,
      },
    ];
  }

  private dedupeMemories(memories: Memory[]): Memory[] {
    const seen = new Set<string>();
    const deduped: Memory[] = [];

    for (const memory of memories) {
      const key = this.memoryKey(memory);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(memory);
    }

    return deduped;
  }

  private isEquivalentMemory(memory: Memory, draft: MemoryDraft): boolean {
    return this.memoryKey(memory) === this.memoryKey(draft);
  }

  private memoryKey(memory: Pick<Memory, "type" | "title" | "content">): string {
    return `${memory.type}|${this.normalize(memory.title)}|${this.normalize(memory.content)}`;
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }
}
