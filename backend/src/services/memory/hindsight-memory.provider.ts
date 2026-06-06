import { Memory, MemoryDraft, MemoryReflection, ProjectId, ScoredMemory } from "../../types";
import { keywordScore } from "../../utils/score";
import { LocalMemoryProvider } from "./local-memory.provider";
import { MemoryProvider } from "./memory-provider.interface";

export interface HindsightProviderConfig {
  apiUrl: string;
  apiKey: string;
  projectPrefix: string;
  fallbackProvider: LocalMemoryProvider;
}

interface HindsightMemoryLike {
  id?: string;
  memory_id?: string;
  unit_id?: string;
  type?: string;
  title?: string;
  text?: string;
  content?: string;
  memory?: string;
  score?: number;
  similarity?: number;
  metadata?: Record<string, unknown>;
  document?: {
    metadata?: Record<string, unknown>;
  };
  created_at?: string;
  createdAt?: string;
}

export function normalizeHindsightMetadata(input: Record<string, unknown>): Record<string, string | number | boolean> {
  const normalized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalized[key] = value;
      continue;
    }

    normalized[key] = JSON.stringify(value);
  }

  return normalized;
}

export class HindsightMemoryProvider implements MemoryProvider {
  readonly name = "hindsight" as const;
  private readonly baseUrl: string;

  constructor(private readonly config: HindsightProviderConfig) {
    this.baseUrl = config.apiUrl.replace(/\/+$/, "");
  }

  getBankId(projectId: ProjectId): string {
    const sessionId = process.env.HINDSIGHT_DEMO_SESSION_ID?.trim();
    return sessionId ? `${this.config.projectPrefix}:${sessionId}:${projectId}` : `${this.config.projectPrefix}:${projectId}`;
  }

  async ensureBank(_projectId: ProjectId): Promise<void> {
    // Hindsight Cloud memory operations can target a bank ID directly. Keep this hook for APIs
    // that later require explicit bank creation or project-level bank configuration.
  }

  async retain(projectId: ProjectId, draft: MemoryDraft): Promise<Memory> {
    const existing = (await this.config.fallbackProvider.list(projectId)).find((memory) => this.isEquivalentMemory(memory, draft));
    if (existing) {
      return { ...existing, duplicate: true } as Memory;
    }

    const createdAt = new Date().toISOString();
    const normalized: Memory = {
      ...draft,
      id: `hindsight-${projectId}-${Date.now()}`,
      projectId,
      createdAt,
    };

    try {
      await this.ensureBank(projectId);
      await this.request(`/v1/default/banks/${encodeURIComponent(this.getBankId(projectId))}/memories`, {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              content: this.toRetainContent(projectId, draft, createdAt),
              context: `DevContext OS memory for ${projectId}. Type: ${draft.type}. Related files: ${
                draft.relatedFiles.join(", ") || "none"
              }.`,
              timestamp: createdAt,
              source: "devcontext-os",
              tags: this.toTags(projectId, draft).join(", "),
              metadata: normalizeHindsightMetadata({
                type: draft.type,
                title: draft.title,
                relatedFiles: draft.relatedFiles,
                tags: draft.tags ?? this.toTags(projectId, draft),
                source: "devcontext-os",
                projectId,
                createdAt,
              }),
            },
          ],
        }),
      });

      await this.config.fallbackProvider.retain(projectId, draft);
      return { ...normalized, provider: "hindsight", fallbackUsed: false };
    } catch (error) {
      this.warnAndFallback("retain", error);
      const fallbackMemory = await this.config.fallbackProvider.retain(projectId, draft);
      return {
        ...fallbackMemory,
        provider: "local",
        fallbackUsed: true,
        fallbackReason: "Hindsight retain failed",
      };
    }
  }

  async recall(projectId: ProjectId, query: string, limit = 5): Promise<ScoredMemory[]> {
    try {
      await this.ensureBank(projectId);
      const response = await this.request(`/v1/default/banks/${encodeURIComponent(this.getBankId(projectId))}/memories/recall`, {
        method: "POST",
        body: JSON.stringify({
          query,
          limit,
        }),
      });
      const normalized = this.extractMemoryArray(response)
        .map((item) => this.normalizeMemory(projectId, item, query))
        .filter((memory): memory is ScoredMemory => Boolean(memory))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (normalized.length > 0) {
        return normalized;
      }

      return this.config.fallbackProvider.recall(projectId, query, limit);
    } catch (error) {
      this.warnAndFallback("recall", error);
      return this.config.fallbackProvider.recall(projectId, query, limit);
    }
  }

  async list(projectId: ProjectId): Promise<Memory[]> {
    try {
      await this.ensureBank(projectId);
      const response = await this.request(`/v1/default/banks/${encodeURIComponent(this.getBankId(projectId))}/memories/list`, {
        method: "GET",
      });
      const normalized = this.extractMemoryArray(response)
        .map((item) => this.normalizeMemory(projectId, item, ""))
        .filter((memory): memory is ScoredMemory => Boolean(memory))
        .map(({ score: _score, ...memory }) => memory)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      if (normalized.length > 0) {
        const localAudit = await this.config.fallbackProvider.list(projectId);
        return this.mergeByTitleAndContent(localAudit, normalized);
      }
    } catch (error) {
      this.warnAndFallback("list", error);
    }

    return this.config.fallbackProvider.list(projectId);
  }

  async reflect(projectId: ProjectId, query: string, context?: unknown): Promise<MemoryReflection> {
    const recalledMemories = await this.recall(projectId, query, 5);
    const fallbackReflection = this.structuredReflection(projectId, query, context, recalledMemories);

    try {
      await this.ensureBank(projectId);
      const response = await this.request(`/v1/default/banks/${encodeURIComponent(this.getBankId(projectId))}/reflect`, {
        method: "POST",
        body: JSON.stringify({
          query,
          context: JSON.stringify({
            query,
            userContext: context ?? {},
            recalledMemories: recalledMemories.map((memory) => ({
              type: memory.type,
              title: memory.title,
              content: memory.content,
              relatedFiles: memory.relatedFiles,
            })),
          }),
          budget: "low",
        }),
      });
      const responseRecord = this.asRecord(response);
      const reflection =
        this.asString(responseRecord.text) ??
        this.asString(responseRecord.answer) ??
        this.asString(responseRecord.reflection) ??
        "Hindsight returned a reflection without text.";

      if (this.isWeakReflection(reflection)) {
        return {
          provider: "hindsight",
          ...fallbackReflection,
          fallbackReflectionUsed: true,
        };
      }

      return {
        provider: "hindsight",
        reflection,
        suggestedMemories: fallbackReflection.suggestedMemories,
        fallbackReflectionUsed: false,
      };
    } catch (error) {
      this.warnAndFallback("reflect", error);
      return {
        provider: "hindsight",
        ...fallbackReflection,
        fallbackReflectionUsed: true,
      };
    }
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : {};

    if (!response.ok) {
      throw new Error(`Hindsight ${response.status} ${response.statusText}: ${this.safeJson(body)}`);
    }

    return body;
  }

  private normalizeMemory(projectId: ProjectId, item: HindsightMemoryLike, query: string): ScoredMemory | null {
    const metadata = this.extractMetadata(item);
    const content = this.asString(item.content) ?? this.asString(item.text) ?? this.asString(item.memory);

    if (!content) {
      return null;
    }

    const type = this.normalizeType(this.asString(metadata.type) ?? this.asString(item.type));
    const title = this.asString(metadata.title) ?? this.asString(item.title) ?? content.slice(0, 72);
    const relatedFiles = this.parseRelatedFiles(metadata.relatedFiles);
    const score = item.score ?? item.similarity ?? keywordScore(query, [title, content, relatedFiles.join(" ")]);

    return {
      id: this.asString(item.id) ?? this.asString(item.memory_id) ?? this.asString(item.unit_id) ?? `hindsight-${Date.now()}`,
      projectId,
      type,
      title,
      content,
      relatedFiles,
      createdAt:
        this.asString(metadata.createdAt) ??
        this.asString(item.createdAt) ??
        this.asString(item.created_at) ??
        new Date().toISOString(),
      score,
    };
  }

  private toRetainContent(projectId: ProjectId, draft: MemoryDraft, createdAt: string): string {
    return [
      `Project: ${projectId}`,
      `Type: ${draft.type}`,
      `Title: ${draft.title}`,
      `Content: ${draft.content}`,
      `Related files: ${draft.relatedFiles.join(", ") || "none"}`,
      "Source: devcontext-os",
      `Created at: ${createdAt}`,
    ].join("\n");
  }

  private toTags(projectId: ProjectId, draft: MemoryDraft): string[] {
    return [...new Set(["devcontext-os", projectId, draft.type, ...(draft.tags ?? []), ...draft.relatedFiles.map((file) => `file:${file}`)])];
  }

  private parseRelatedFiles(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((file): file is string => typeof file === "string");
    }
    if (typeof value !== "string" || value.length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((file): file is string => typeof file === "string");
      }
    } catch {
      // Hindsight metadata may store relatedFiles as a comma-delimited string.
    }

    return value
      .split(",")
      .map((file) => file.trim())
      .filter(Boolean);
  }

  private extractMemoryArray(response: unknown): HindsightMemoryLike[] {
    const record = this.asRecord(response);
    const candidates = [response, record.results, record.memories, record.items, record.data];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.map((item) => this.asRecord(item) as HindsightMemoryLike);
      }
    }

    return [];
  }

  private extractMetadata(item: HindsightMemoryLike): Record<string, unknown> {
    return {
      ...this.asRecord(item.document?.metadata),
      ...this.asRecord(item.metadata),
    };
  }

  private mergeByTitleAndContent(localMemories: Memory[], hindsightMemories: Memory[]): Memory[] {
    const merged = [...localMemories];
    const seen = new Set(merged.map((memory) => `${memory.title}|${memory.content}`));

    for (const memory of hindsightMemories) {
      const key = `${memory.title}|${memory.content}`;
      if (!seen.has(key)) {
        merged.push(memory);
        seen.add(key);
      }
    }

    return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private localSuggestedMemories(context: unknown): MemoryDraft[] {
    const contextRecord = typeof context === "object" && context !== null ? (context as Record<string, unknown>) : {};
    const filesTouched = Array.isArray(contextRecord.filesTouched)
      ? contextRecord.filesTouched.filter((file): file is string => typeof file === "string")
      : [];

    return [
      {
        type: "decision",
        title: "Reflection follow-up",
        content: "Review Hindsight reflection output and retain only durable project decisions, risks, or preferences.",
        relatedFiles: filesTouched,
      },
    ];
  }

  private structuredReflection(
    _projectId: ProjectId,
    query: string,
    context: unknown,
    memories: ScoredMemory[],
  ): Omit<MemoryReflection, "provider"> {
    const topMemory = memories[0];
    const files = [
      ...new Set([
        ...memories.flatMap((memory) => memory.relatedFiles),
        ...this.filesFromContext(context),
      ]),
    ];

    if (!topMemory) {
      return {
        reflection: `No durable memory matched "${query}" yet. Capture the task outcome, files touched, risks, and implementation decisions after the work is complete.`,
        suggestedMemories: this.localSuggestedMemories(context),
      };
    }

    return {
      reflection: `The project has a durable ${topMemory.type} memory "${topMemory.title}": ${topMemory.content} Future work for "${query}" should preserve this lesson and check related files ${files.join(", ") || "not specified"}.`,
      suggestedMemories: [
        {
          type: topMemory.type === "risk" ? "risk" : "decision",
          title: `Preserve ${topMemory.title}`,
          content: `Future work should preserve this remembered context: ${topMemory.content}`,
          relatedFiles: files,
        },
      ],
    };
  }

  private filesFromContext(context: unknown): string[] {
    const record = typeof context === "object" && context !== null ? (context as Record<string, unknown>) : {};
    return Array.isArray(record.filesTouched) ? record.filesTouched.filter((file): file is string => typeof file === "string") : [];
  }

  private isWeakReflection(reflection: string): boolean {
    const normalized = reflection.toLowerCase().trim();
    return normalized.length < 32 || normalized === "i don't have information." || normalized === "i do not have information.";
  }

  private normalizeType(type?: string): Memory["type"] {
    if (
      type === "bug" ||
      type === "decision" ||
      type === "style" ||
      type === "risk" ||
      type === "preference" ||
      type === "task" ||
      type === "architecture" ||
      type === "follow-up"
    ) {
      return type;
    }
    if (type === "experience") {
      return "task";
    }
    return "decision";
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private safeJson(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return "[unserializable response]";
    }
  }

  private warnAndFallback(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Hindsight ${operation} failed; falling back to local memory provider. ${message}`);
  }

  private isEquivalentMemory(memory: Memory, draft: MemoryDraft): boolean {
    return `${memory.type}|${this.normalize(memory.title)}|${this.normalize(memory.content)}` ===
      `${draft.type}|${this.normalize(draft.title)}|${this.normalize(draft.content)}`;
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }
}
