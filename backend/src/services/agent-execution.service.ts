import { ChangedFile, ExecutablePatch, GeneratedTask, HindsightRetentionReport, IncrementalRagUpdateResult, Memory, MemoryDraft, ProjectId, ScoredMemory } from "../types";
import { CodingAgentProvider, LearningSummary } from "./coding-agent/coding-agent-provider.interface";
import { GitHubWriteService } from "./github-write.service";
import { LocalMemoryService } from "./local-memory.service";
import { LocalRagService } from "./local-rag.service";
import { PatchEngineService } from "./patch-engine.service";
import { ProjectService } from "./project.service";
import { TaskService } from "./task.service";
import { MemoryQualityService } from "./memory/memory-quality.service";

export class AgentExecutionService {
  constructor(
    private readonly ragService: LocalRagService,
    private readonly memoryService: LocalMemoryService,
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
    private readonly patchEngine: PatchEngineService,
    private readonly githubWriteService: GitHubWriteService,
    private readonly codingAgentProvider: CodingAgentProvider,
    private readonly memoryQuality: MemoryQualityService,
  ) {}

  async createExecutionPlan(projectId: ProjectId, message: string) {
    const project = await this.projectService.getProject(projectId);
    const ragContext = await this.ragService.searchProjectContext(project, message);
    const chunksUsed = ragContext.chunks;
    const memoriesUsed = this.memoryQuality.filterUseful(await this.memoryService.recall(projectId, ragContext.query, 12), 8) as ScoredMemory[];
    const taskType = this.classifyTask(message);
    const learningSummary = await this.learningSummary(projectId);
    const agentResult = await this.codingAgentProvider.runTask({
      projectId,
      project,
      message,
      mode: "preview-only",
      ragContext: chunksUsed,
      hindsightMemories: memoriesUsed,
      learningSummary,
      allowedFiles: chunksUsed.map((chunk) => chunk.filePath),
      maxFiles: 3,
    });
    const patchPreview = this.validatePatchPreview(agentResult.patchPreview);
    const filesTouched = patchPreview.map((patch) => patch.filePath);
    const memoryToSave: MemoryDraft[] = agentResult.suggestedMemories;

    const task = this.taskService.createTask({
      projectId,
      message,
      taskType,
      status: "patch_generated",
      plan: this.ensureMemoryInfluence(agentResult.plan, agentResult.memoryInfluence, memoriesUsed.length),
      chunksUsed,
      memoriesUsed,
      chunksUsedCount: chunksUsed.length,
      memoriesUsedCount: memoriesUsed.length,
      patchPreview,
      testsToRun: agentResult.testsToRun,
      risks: agentResult.risks,
      filesTouched,
      memoryToSave,
      agentProvider: this.codingAgentProvider.name,
      memoryInfluence: agentResult.memoryInfluence,
      confidence: agentResult.confidence,
    });

    return {
      task,
      plan: task.plan,
      memoryInfluence: agentResult.memoryInfluence,
      chunksUsed,
      memoriesUsed,
      patchPreview,
      testsToRun: agentResult.testsToRun,
      risks: agentResult.risks,
      suggestedMemories: memoryToSave,
      requiresApproval: agentResult.requiresApproval,
      agentProvider: this.codingAgentProvider.name,
      confidence: agentResult.confidence,
      memoryProvider: this.memoryService.providerName,
      memoryFallbackUsed: false,
      ragProvider: this.ragService.providerName,
      semanticSearch: this.ragService.providerName === "pgvector",
      ragFallbackUsed: ragContext.fallbackUsed,
    };
  }

  async runTask(projectId: ProjectId, message: string, mode: "safe-auto" | "preview-only") {
    const preview = await this.createExecutionPlan(projectId, message);
    if (mode === "preview-only") {
      return {
        ...preview,
        mode,
        applyResult: null,
        incrementalRagUpdate: null,
        savedMemories: [],
      };
    }

    const applyResult = await this.approveAndApplyPatch(projectId, preview.task.id);
    return {
      ...preview,
      mode,
      task: applyResult.task ?? preview.task,
      applyResult,
      incrementalRagUpdate: applyResult.incrementalRagUpdate ?? null,
      savedMemories: applyResult.savedMemories ?? [],
      hindsightRetention: applyResult.hindsightRetention ?? null,
      memoryProvider: applyResult.memoryProvider ?? this.memoryService.providerName,
      memoryFallbackUsed: Boolean(applyResult.memoryFallbackUsed),
    };
  }

  async generatePatch(projectId: ProjectId, taskId: string): Promise<GeneratedTask | null> {
    return this.taskService.getTask(projectId, taskId);
  }

  async approveAndApplyPatch(projectId: ProjectId, taskId: string) {
    const task = this.taskService.getTask(projectId, taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    this.taskService.updateTask(projectId, taskId, { status: "approved" });
    const project = await this.projectService.getProject(projectId);
    const branchName = this.branchName(task);
    const files = (task.patchPreview ?? []).slice(0, 3).map((patch) => ({
      path: patch.filePath,
      content: patch.newContent,
    }));

    if (!this.githubWriteService.isMockWrite() && !this.githubWriteService.hasToken()) {
      const failedTask = this.taskService.updateTask(projectId, taskId, {
        status: "failed",
        error: "GITHUB_TOKEN missing or repo not writable",
      }) as GeneratedTask;
      return {
        success: false,
        reason: "GITHUB_TOKEN missing or repo not writable",
        patchPreview: task.patchPreview,
        task: failedTask,
      };
    }

    try {
      const title = `DevContext: ${this.taskTitle(task.message)}`;
      const result = await this.githubWriteService.applyPatch({
        owner: project.owner,
        repo: project.repoName,
        baseBranch: project.defaultBranch,
        branchName,
        title,
        body: this.pullRequestBody(task),
        files,
      });
      const appliedTask = this.taskService.updateTask(projectId, taskId, {
        status: "pr_created",
        branchName: result.branchName,
        commitSha: result.commitSha,
        prUrl: result.prUrl,
      }) as GeneratedTask;
      const incrementalRagUpdate = await this.updateRagAfterApply(projectId, appliedTask, project.owner, project.repoName, result.branchName);
      const updatedTask = this.taskService.updateTask(projectId, taskId, { incrementalRagUpdate }) as GeneratedTask;
      const memoryRetainResult = await this.retainTaskOutcome(projectId, taskId, incrementalRagUpdate);

      return {
        success: true,
        task: updatedTask,
        branchName: result.branchName,
        commitSha: result.commitSha,
        prUrl: result.prUrl,
        memoryRetained: memoryRetainResult.retained,
        memoryProvider: memoryRetainResult.provider,
        memoryFallbackUsed: memoryRetainResult.fallbackUsed,
        savedMemories: memoryRetainResult.savedMemories,
        hindsightRetention: memoryRetainResult.hindsightRetention,
        incrementalRagUpdate,
      };
    } catch (error) {
      const failedTask = this.taskService.updateTask(projectId, taskId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Patch apply failed",
      }) as GeneratedTask;
      return {
        success: false,
        reason: failedTask.error ?? "Patch apply failed",
        patchPreview: task.patchPreview,
        task: failedTask,
      };
    }
  }

  async retainTaskOutcome(
    projectId: ProjectId,
    taskId: string,
    incrementalRagUpdate?: IncrementalRagUpdateResult,
  ): Promise<{
    retained: boolean;
    provider: "local" | "hindsight";
    fallbackUsed: boolean;
    savedMemories: Memory[];
    hindsightRetention: HindsightRetentionReport;
  }> {
    const task = this.taskService.getTask(projectId, taskId);
    if (!task) {
      return {
        retained: false,
        provider: this.memoryService.providerName,
        fallbackUsed: false,
        savedMemories: [],
        hindsightRetention: { provider: this.memoryService.providerName, fallbackUsed: false, retained: [], skipped: [], duplicatesSkipped: 0 },
      };
    }
    const ragUpdate = incrementalRagUpdate ?? task.incrementalRagUpdate;
    const existing = await this.memoryService.list(projectId);

    const taskMemory: MemoryDraft = {
      type: "task",
      title: this.taskTitle(task.message),
      content: [
        `Task applied through DevContext OS: ${task.message}`,
        `Why: ${task.plan?.split("\n")[0] ?? "Approved DevContext patch workflow."}`,
        `Files touched: ${(task.filesTouched ?? []).join(", ") || "none"}`,
        `PR: ${task.prUrl ?? "not available"}`,
        `Risks: ${(task.risks ?? []).join(" ") || "none"}`,
        `Tests to run: ${(task.testsToRun ?? []).join(", ") || "not specified"}`,
        ragUpdate
          ? `RAG incrementally updated ${ragUpdate.filesUpdated} file(s), deleted ${ragUpdate.filesDeleted} file(s), and inserted ${ragUpdate.chunksInserted} ${
              ragUpdate.semanticIndex ? "semantic" : "local"
            } chunk(s) using ${ragUpdate.provider}.`
          : "RAG incremental update summary unavailable.",
      ].join("\n"),
      relatedFiles: task.filesTouched ?? [],
      tags: ["task", "patch", "rag-updated", "github-pr"],
    };
    const candidates = [taskMemory, ...(task.memoryToSave ?? []), ...this.extractDurableMemories(task, ragUpdate)].filter(
      (memory) => !this.isRagOnlyMemory(memory),
    );
    const selected = this.memoryQuality.selectForTask(candidates, existing);
    let fallbackUsed = false;
    let provider = this.memoryService.providerName;
    const savedMemories: Memory[] = [];
    const retainedReport: HindsightRetentionReport["retained"] = [];
    const skippedReport: HindsightRetentionReport["skipped"] = [];

    for (const decision of selected.decisions) {
      if (!decision.keep) {
        skippedReport.push({
          type: decision.candidate.type,
          title: decision.candidate.title,
          reason: decision.reason,
          importance: decision.importance,
        });
        continue;
      }
      const retained = await this.memoryService.retain(projectId, {
        ...decision.candidate,
        memoryKey: decision.normalizedKey,
      });
      savedMemories.push(retained);
      fallbackUsed = fallbackUsed || Boolean(retained.fallbackUsed);
      if (retained.provider) provider = retained.provider;
      retainedReport.push({
        type: decision.candidate.type,
        title: decision.candidate.title,
        memoryKey: decision.normalizedKey,
        importance: decision.importance,
      });
    }
    const hindsightRetention: HindsightRetentionReport = {
      provider,
      fallbackUsed,
      retained: retainedReport,
      skipped: skippedReport,
      duplicatesSkipped: selected.duplicatesSkipped,
    };

    this.taskService.updateTask(projectId, taskId, { savedMemories, hindsightRetention });
    return { retained: savedMemories.length > 0, provider, fallbackUsed, savedMemories, hindsightRetention };
  }

  private async updateRagAfterApply(
    projectId: ProjectId,
    task: GeneratedTask,
    owner?: string,
    repo?: string,
    branchName?: string,
  ): Promise<IncrementalRagUpdateResult> {
    const changedFiles: ChangedFile[] = [];
    const warnings: string[] = [];

    for (const patch of (task.patchPreview ?? []).slice(0, 3)) {
      if (patch.status === "deleted") {
        changedFiles.push({ filePath: patch.filePath, status: "deleted" });
        continue;
      }

      if (this.githubWriteService.isMockWrite()) {
        if (!patch.newContent) {
          warnings.push(`No newContent available for ${patch.filePath}; skipped incremental RAG update.`);
          continue;
        }
        changedFiles.push({ filePath: patch.filePath, status: patch.status ?? "modified", content: patch.newContent });
        continue;
      }

      if (!owner || !repo || !branchName) {
        warnings.push(`GitHub project metadata missing for ${patch.filePath}; skipped incremental RAG update.`);
        continue;
      }

      const content = await this.githubWriteService.getFileContent(owner, repo, patch.filePath, branchName);
      changedFiles.push({ filePath: patch.filePath, status: patch.status ?? "modified", content });
    }

    if (changedFiles.length === 0) {
      return {
        provider: this.ragService.providerName,
        semanticIndex: this.ragService.providerName === "pgvector",
        filesUpdated: 0,
        filesDeleted: 0,
        chunksInserted: 0,
        warnings,
      };
    }

    const result = await this.ragService.updateChangedFiles(projectId, changedFiles);
    return {
      ...result,
      warnings: [...warnings, ...result.warnings],
    };
  }

  private extractDurableMemories(task: GeneratedTask, ragUpdate?: IncrementalRagUpdateResult): MemoryDraft[] {
    const files = task.filesTouched ?? [];
    const memories: MemoryDraft[] = [];

    if (files.some((file) => /(^|\/)readme(\.md)?$/i.test(file))) {
      memories.push({
        type: "decision",
        title: "README setup guidance",
        content: "README setup instructions should stay accurate, avoid duplicate setup sections, and preserve browser-extension loading guidance when relevant.",
        relatedFiles: files.filter((file) => /(^|\/)readme(\.md)?$/i.test(file)),
        tags: ["decision", "documentation", "follow-up"],
      });
    }

    for (const risk of task.risks ?? []) {
      if (risk.length < 24) continue;
      memories.push({
        type: "risk",
        title: this.titleFromRisk(risk),
        content: risk,
        relatedFiles: files,
        tags: ["risk", "task-learning"],
      });
      break;
    }

    if (ragUpdate && ragUpdate.warnings.length > 0) {
      memories.push({
        type: "risk",
        title: "Incremental RAG update warning",
        content: `Incremental RAG update completed with warnings: ${ragUpdate.warnings.join(" ")}`,
        relatedFiles: files,
        tags: ["risk", "rag-updated"],
      });
    }

    return memories.slice(0, 4);
  }

  private isRagOnlyMemory(memory: MemoryDraft): boolean {
    return /rag index|rag update|semantic chunk|local chunk|indexed \d+|inserted \d+/i.test(`${memory.title} ${memory.content}`) && memory.type !== "task";
  }

  private titleFromRisk(risk: string): string {
    const cleaned = risk.replace(/[^A-Za-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.length > 64 ? `${cleaned.slice(0, 61)}...` : cleaned || "Task risk";
  }

  private classifyTask(message: string): string {
    const lower = message.toLowerCase();
    if (/(fix|bug|error|issue)/.test(lower)) return "bugfix";
    if (/(add|implement|support|feature)/.test(lower)) return "feature";
    if (/(refactor|cleanup|rename)/.test(lower)) return "refactor";
    return "task";
  }

  private buildPlan(message: string, files: string[], memories: string[]): string {
    return [
      `Task: ${message}`,
      memories.length > 0
        ? `Memory influence: ${memories
            .slice(0, 3)
            .map((memory) => `${memory} should shape the implementation plan`)
            .join("; ")}.`
        : "Memory influence: No matching memory signals found yet.",
      `1. Review relevant files: ${files.slice(0, 3).join(", ") || "no strong RAG matches"}.`,
      `2. Apply the smallest patch preview possible.`,
      `3. Run tests/checks listed in the response.`,
      `4. Retain task outcome memory after PR creation.`,
      memories.length > 0 ? `Memory signals: ${memories.join(", ")}.` : "No matching memory signals found.",
    ].join("\n");
  }

  private async learningSummary(projectId: ProjectId): Promise<LearningSummary> {
    const memories = await this.memoryService.list(projectId);
    const byType = (type: string) => memories.filter((memory) => memory.type === type);
    const fileCounts = new Map<string, number>();
    for (const memory of memories) {
      for (const file of memory.relatedFiles) fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
    }
    return {
      projectId,
      provider: this.memoryService.providerName,
      memoryCount: memories.length,
      recentTasks: byType("task").slice(-5),
      decisions: byType("decision").slice(-8),
      risks: byType("risk").slice(-8),
      preferences: byType("preference").slice(-8),
      followUps: byType("follow-up").slice(-8),
      topFilesMentioned: [...fileCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([filePath, count]) => ({ filePath, count })),
    };
  }

  private ensureMemoryInfluence(plan: string, memoryInfluence: string, memoryCount: number): string {
    if (/Memory influence/i.test(plan)) return plan;
    const influence = memoryCount > 0 ? memoryInfluence : "Memory influence: No matching memory signals found yet.";
    return [`Memory influence: ${influence.replace(/^Memory influence:\s*/i, "")}`, plan].join("\n");
  }

  private validatePatchPreview(patches: ExecutablePatch[]): ExecutablePatch[] {
    return patches.slice(0, 3).map((patch) => {
      this.validateFilePath(patch.filePath);
      if (patch.newContent && patch.newContent.length > 120000) {
        throw new Error(`Patch for ${patch.filePath} is too large for safe apply.`);
      }
      return patch;
    });
  }

  private validateFilePath(filePath: string): void {
    const lower = filePath.toLowerCase();
    if (
      filePath.startsWith("/") ||
      filePath.includes("..") ||
      lower.includes(".git/") ||
      lower.includes("node_modules/") ||
      lower === ".env" ||
      lower.endsWith("/.env") ||
      lower.includes("secret")
    ) {
      throw new Error(`Unsafe patch file path rejected: ${filePath}`);
    }
  }

  private pullRequestBody(task: GeneratedTask): string {
    return [
      `## Task`,
      task.message,
      ``,
      `## Files Changed`,
      ...(task.filesTouched ?? []).map((file) => `- ${file}`),
      ``,
      `## Memories Used`,
      ...(task.memoriesUsed ?? []).map((memory) => `- ${memory.title}`),
      ``,
      `## Risks`,
      ...(task.risks ?? []).map((risk) => `- ${risk}`),
      ``,
      `## Tests To Run`,
      ...(task.testsToRun ?? []).map((test) => `- ${test}`),
      ``,
      `Generated by DevContext OS.`,
    ].join("\n");
  }

  private branchName(task: GeneratedTask): string {
    return `devcontext/${this.slug(task.message)}-${task.id.replace(/^task-/, "").slice(0, 8)}`;
  }

  private taskTitle(message: string): string {
    return message.length > 80 ? `${message.slice(0, 77)}...` : message;
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "task";
  }
}
