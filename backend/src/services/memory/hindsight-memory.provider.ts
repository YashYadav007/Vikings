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

export class HindsightMemoryProvider implements MemoryProvider {
  readonly name = "hindsight" as const;
  private readonly baseUrl: string;

  constructor(private readonly config: HindsightProviderConfig) {
    this.baseUrl = config.apiUrl.replace(/\/+$/, "");
  }

  getBankId(projectId: ProjectId): string {
    return `${this.config.projectPrefix}:${projectId}`;
  }

  async ensureBank(_projectId: ProjectId): Promise<void> {
    // Hindsight Cloud memory operations can target a bank ID directly. Keep this hook for APIs
    // that later require explicit bank creation or project-level bank configuration.
  }

  async retain(projectId: ProjectId, draft: MemoryDraft): Promise<Memory> {
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
              tags: this.toTags(projectId, draft),
              metadata: {
                type: draft.type,
                title: draft.title,
                relatedFiles: draft.relatedFiles,
                source: "devcontext-os",
                projectId,
                createdAt,
              },
            },
          ],
        }),
      });

      await this.config.fallbackProvider.retain(projectId, draft);
      return normalized;
    } catch (error) {
      this.warnAndFallback("retain", error);
      return this.config.fallbackProvider.retain(projectId, draft);
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
    try {
      await this.ensureBank(projectId);
      const response = await this.request(`/v1/default/banks/${encodeURIComponent(this.getBankId(projectId))}/reflect`, {
        method: "POST",
        body: JSON.stringify({
          query,
          context: typeof context === "string" ? context : JSON.stringify(context ?? {}),
          budget: "low",
        }),
      });
      const responseRecord = this.asRecord(response);
      const reflection =
        this.asString(responseRecord.text) ??
        this.asString(responseRecord.answer) ??
        this.asString(responseRecord.reflection) ??
        "Hindsight returned a reflection without text.";

      return {
        provider: "hindsight",
        reflection,
        suggestedMemories: this.localSuggestedMemories(context),
      };
    } catch (error) {
      this.warnAndFallback("reflect", error);
      return this.config.fallbackProvider.reflect(projectId, query, context);
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
    const relatedFiles = Array.isArray(metadata.relatedFiles)
      ? metadata.relatedFiles.filter((file): file is string => typeof file === "string")
      : [];
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
    return ["devcontext-os", projectId, draft.type, ...draft.relatedFiles.map((file) => `file:${file}`)];
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

  private normalizeType(type?: string): Memory["type"] {
    if (type === "bug" || type === "decision" || type === "style" || type === "risk" || type === "preference" || type === "task") {
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
}
