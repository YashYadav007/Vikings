import { Memory, MemoryDraft, MemoryQualityDecision, MemoryType } from "../../types";

const ALLOWED_TYPES = new Set<MemoryType>(["task", "decision", "risk", "preference", "follow-up", "architecture"]);
const NOISY_PATTERNS = [
  /assistant is tasked with/i,
  /the assistant is tasked with/i,
  /assistant improved/i,
  /assistant updated/i,
  /updated the rag index/i,
  /rag index/i,
  /inserted \d+ (semantic |local )?chunk/i,
  /indexed \d+ (semantic |local )?rag chunks/i,
  /project indexed \d+/i,
  /generated patch/i,
  /generated patch should be reviewed/i,
  /reviewed before real github write/i,
  /devcontext planned change/i,
  /must be reviewed before approval/i,
  /conservative preview/i,
];

export interface MemoryQualityReport {
  projectId: string;
  provider: "local" | "hindsight";
  totalMemories: number;
  duplicateGroups: Array<{ normalizedKey: string; count: number; memories: Memory[] }>;
  noisyMemories: Memory[];
  recommendedKeep: Memory[];
  recommendedArchive: Memory[];
  latestArchitectureMemory: Memory | null;
}

export class MemoryQualityService {
  evaluate(candidate: MemoryDraft, existing: Memory[] = [], seenKeys = new Set<string>()): MemoryQualityDecision {
    const normalizedKey = this.memoryKey(candidate);
    const importance = this.score(candidate);
    const duplicate = seenKeys.has(normalizedKey) || existing.some((memory) => this.memoryKey(memory) === normalizedKey || this.nearDuplicate(memory, candidate));

    if (!ALLOWED_TYPES.has(candidate.type)) {
      return { candidate, keep: false, reason: `Memory type ${candidate.type} is not durable enough for Hindsight.`, importance, normalizedKey };
    }
    if (duplicate) {
      return { candidate, keep: false, reason: "Duplicate or near-duplicate durable memory.", importance, normalizedKey };
    }
    if (this.isNoisy(candidate)) {
      return { candidate, keep: false, reason: "Operational log or generic assistant event, not durable project learning.", importance: Math.min(importance, 3), normalizedKey };
    }
    if (importance < 6) {
      return { candidate, keep: false, reason: "Low future usefulness.", importance, normalizedKey };
    }

    return { candidate: { ...candidate, memoryKey: normalizedKey }, keep: true, reason: "Durable project learning.", importance, normalizedKey };
  }

  selectForTask(candidates: MemoryDraft[], existing: Memory[]): { decisions: MemoryQualityDecision[]; duplicatesSkipped: number } {
    const seen = new Set<string>();
    const decisions = candidates.map((candidate) => {
      const decision = this.evaluate(candidate, existing, seen);
      if (decision.keep) seen.add(decision.normalizedKey);
      return decision;
    });

    const keptByType: Partial<Record<MemoryType, number>> = {};
    const limits: Partial<Record<MemoryType, number>> = {
      task: 1,
      decision: 2,
      risk: 2,
      preference: 1,
      "follow-up": 1,
      architecture: 1,
    };

    const sorted = [...decisions].sort((a, b) => b.importance - a.importance);
    const limited = sorted.map((decision) => {
      if (!decision.keep) return decision;
      const limit = limits[decision.candidate.type] ?? 0;
      const current = keptByType[decision.candidate.type] ?? 0;
      if (current >= limit) {
        return { ...decision, keep: false, reason: `Per-task ${decision.candidate.type} memory limit reached.` };
      }
      keptByType[decision.candidate.type] = current + 1;
      return decision;
    });

    return {
      decisions: limited,
      duplicatesSkipped: limited.filter((decision) => /duplicate/i.test(decision.reason)).length,
    };
  }

  filterUseful(memories: Memory[], limit = 8): Memory[] {
    const groups = new Map<string, Memory>();
    for (const memory of memories) {
      if (this.isNoisy(memory)) continue;
      const key = this.memoryKey(memory);
      const current = groups.get(key);
      if (!current || current.createdAt < memory.createdAt) groups.set(key, memory);
    }
    return [...groups.values()]
      .sort((a, b) => this.score(b) - this.score(a) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  qualityReport(projectId: string, provider: "local" | "hindsight", memories: Memory[]): MemoryQualityReport {
    const grouped = new Map<string, Memory[]>();
    for (const memory of memories) {
      const key = this.memoryKey(memory);
      grouped.set(key, [...(grouped.get(key) ?? []), memory]);
    }
    const duplicateGroups = [...grouped.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([normalizedKey, group]) => ({ normalizedKey, count: group.length, memories: group }));
    const noisyMemories = memories.filter((memory) => this.isNoisy(memory) || this.score(memory) < 6);
    const latestArchitectureMemory =
      memories.filter((memory) => memory.type === "architecture").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

    return {
      projectId,
      provider,
      totalMemories: memories.length,
      duplicateGroups,
      noisyMemories,
      recommendedKeep: this.filterUseful(memories, 50),
      recommendedArchive: noisyMemories,
      latestArchitectureMemory,
    };
  }

  memoryKey(memory: Pick<MemoryDraft, "type" | "title" | "content" | "relatedFiles">): string {
    const concept = this.durableConcept(memory);
    const files = [...new Set(memory.relatedFiles)].sort().join(",");
    return `${memory.type}|${this.normalize(memory.title)}|${this.normalize(files)}|${concept}`;
  }

  private score(memory: Pick<MemoryDraft, "type" | "title" | "content" | "relatedFiles">): number {
    let score = 4;
    if (memory.type === "task") score = 8;
    if (memory.type === "decision") score = 7;
    if (memory.type === "risk") score = 8;
    if (memory.type === "preference") score = 7;
    if (memory.type === "follow-up") score = 6;
    if (memory.type === "architecture") score = 7;
    if (memory.relatedFiles.length > 0) score += 1;
    if (/(security|token|password|auth|payment|checkout|manifest|setup|convention|avoid duplicate|risk)/i.test(memory.content)) score += 1;
    if (this.isNoisy(memory)) score -= 5;
    if (memory.content.trim().length < 45 && memory.type !== "preference") score -= 2;
    return Math.max(0, Math.min(10, score));
  }

  private isNoisy(memory: Pick<MemoryDraft, "title" | "content">): boolean {
    const text = `${memory.title}\n${memory.content}`;
    return NOISY_PATTERNS.some((pattern) => pattern.test(text));
  }

  private nearDuplicate(existing: Memory, candidate: MemoryDraft): boolean {
    if (existing.type !== candidate.type) return false;
    const titleA = this.normalize(existing.title);
    const titleB = this.normalize(candidate.title);
    if (titleA === titleB) return true;
    return this.durableConcept(existing) === this.durableConcept(candidate);
  }

  private durableConcept(memory: Pick<MemoryDraft, "title" | "content">): string {
    return this.normalize(`${memory.title} ${memory.content}`)
      .replace(/\b(task|applied|through|devcontext|project|assistant|updated|rag|chunk|chunks|index|indexed)\b/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
}
