import { ExecutablePatch, GeneratedTask, MemoryDraft, ProjectId } from "../types";
import { GitHubWriteService } from "./github-write.service";
import { LocalMemoryService } from "./local-memory.service";
import { LocalRagService } from "./local-rag.service";
import { PatchEngineService } from "./patch-engine.service";
import { ProjectService } from "./project.service";
import { TaskService } from "./task.service";

export class AgentExecutionService {
  constructor(
    private readonly ragService: LocalRagService,
    private readonly memoryService: LocalMemoryService,
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
    private readonly patchEngine: PatchEngineService,
    private readonly githubWriteService: GitHubWriteService,
  ) {}

  async createExecutionPlan(projectId: ProjectId, message: string) {
    await this.projectService.getProject(projectId);
    const chunksUsed = await this.ragService.search(projectId, message);
    const memoriesUsed = await this.memoryService.recall(projectId, message);
    const taskType = this.classifyTask(message);
    const plan = this.buildPlan(message, chunksUsed.map((chunk) => chunk.filePath), memoriesUsed.map((memory) => memory.title));
    const patch = this.patchEngine.generatePatch(message, chunksUsed, memoriesUsed);
    const memoryToSave: MemoryDraft[] = [
      {
        type: "task",
        title: this.taskTitle(message),
        content: `Generated patch plan for: ${message}`,
        relatedFiles: patch.filesTouched,
        tags: ["task", "patch"],
      },
    ];

    const task = this.taskService.createTask({
      projectId,
      message,
      taskType,
      status: "patch_generated",
      plan,
      chunksUsed,
      memoriesUsed,
      chunksUsedCount: chunksUsed.length,
      memoriesUsedCount: memoriesUsed.length,
      patchPreview: patch.patchPreview,
      testsToRun: patch.testsToRun,
      risks: patch.risks,
      filesTouched: patch.filesTouched,
      memoryToSave,
    });

    return {
      task,
      plan,
      chunksUsed,
      memoriesUsed,
      patchPreview: patch.patchPreview,
      testsToRun: patch.testsToRun,
      risks: patch.risks,
      requiresApproval: true,
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
      const memoryRetained = await this.retainTaskOutcome(projectId, taskId);

      return {
        success: true,
        task: appliedTask,
        branchName: result.branchName,
        commitSha: result.commitSha,
        prUrl: result.prUrl,
        memoryRetained,
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

  async retainTaskOutcome(projectId: ProjectId, taskId: string): Promise<boolean> {
    const task = this.taskService.getTask(projectId, taskId);
    if (!task) return false;

    await this.memoryService.retain(projectId, {
      type: "task",
      title: this.taskTitle(task.message),
      content: [
        `Task applied through DevContext OS: ${task.message}`,
        `Files touched: ${(task.filesTouched ?? []).join(", ") || "none"}`,
        `PR: ${task.prUrl ?? "not available"}`,
        `Risks: ${(task.risks ?? []).join(" ") || "none"}`,
      ].join("\n"),
      relatedFiles: task.filesTouched ?? [],
      tags: ["task", "patch", "github-pr"],
    });

    for (const memory of task.memoryToSave ?? []) {
      await this.memoryService.retain(projectId, memory);
    }

    return true;
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
      `1. Review relevant files: ${files.slice(0, 3).join(", ") || "no strong RAG matches"}.`,
      `2. Apply the smallest patch preview possible.`,
      `3. Run tests/checks listed in the response.`,
      `4. Retain task outcome memory after PR creation.`,
      memories.length > 0 ? `Memory signals: ${memories.join(", ")}.` : "No matching memory signals found.",
    ].join("\n");
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
