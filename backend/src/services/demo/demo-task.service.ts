import {
  ExecutablePatch,
  GeneratedTask,
  HindsightRetentionReport,
  IncrementalRagUpdateResult,
  Memory,
  MemoryDraft,
  ProjectId,
  RagChunk,
  ScoredMemory,
  ScoredRagChunk,
} from "../../types";
import { GitHubWriteService } from "../github-write.service";
import { LocalMemoryService } from "../local-memory.service";
import { LocalRagService } from "../local-rag.service";
import { MemoryQualityService } from "../memory/memory-quality.service";
import { ProjectService } from "../project.service";
import { TaskService } from "../task.service";

const DEMO_MESSAGE =
  "Add a GitHub token safety guard to the Chrome extension so GitHub-related actions show a clear warning when the token is missing, instead of failing silently.";
const DEMO_TITLE = "Add GitHub token safety guard";

export class DemoTaskService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly ragService: LocalRagService,
    private readonly memoryService: LocalMemoryService,
    private readonly taskService: TaskService,
    private readonly githubWriteService: GitHubWriteService,
    private readonly memoryQuality: MemoryQualityService,
  ) {}

  async runGitCodeTokenSafetyDemo(projectId: ProjectId, mode: "safe-auto" | "preview-only" = "safe-auto") {
    const project = await this.projectService.getProject(projectId);
    const memoryQuery = "token storage GitHub token safety Chrome extension popup background security risk";
    const ragQuery = "GitHub token popup chrome.storage local auth token background popup.js content.js security";
    const memoriesUsed = this.memoryQuality.filterUseful(await this.memoryService.recall(projectId, memoryQuery, 12), 8) as ScoredMemory[];
    const chunksUsed = await this.collectRagContext(projectId, ragQuery);
    const patchPreview = this.buildPatchPreview(projectId, await this.ragService.listChunks(projectId));
    const filesTouched = patchPreview.map((patch) => patch.filePath);
    const memoryInfluence = this.buildMemoryInfluence(memoriesUsed);
    const plan = [
      `Memory influence: ${memoryInfluence}`,
      "1. Use RAG to locate Chrome extension popup/token-related files.",
      "2. Add a user-facing GitHub token missing warning before GitHub-related popup actions continue.",
      "3. Add focused warning styling in popup.css when available.",
      "4. Avoid logging token values or storing raw token data in Hindsight.",
      "5. Apply through the existing branch/commit/PR workflow, then update RAG only for changed files.",
    ].join("\n");
    const testsToRun = [
      "Load the unpacked Chrome extension and open the popup with no GitHub token configured.",
      "Click a GitHub-related popup action and verify a clear token warning appears.",
      "Configure a token and verify the warning no longer blocks GitHub actions.",
    ];
    const risks = [
      "GitHub token values must never be logged or exposed in UI text.",
      "The generic click guard should only block GitHub-related popup actions when the token is missing.",
    ];
    const suggestedMemories = this.demoMemories(filesTouched);
    const task = this.taskService.createTask({
      projectId,
      message: DEMO_MESSAGE,
      taskType: "feature",
      status: "patch_generated",
      plan,
      chunksUsed,
      memoriesUsed,
      chunksUsedCount: chunksUsed.length,
      memoriesUsedCount: memoriesUsed.length,
      patchPreview,
      testsToRun,
      risks,
      filesTouched,
      memoryToSave: suggestedMemories,
      agentProvider: "curated-demo",
      memoryInfluence,
      confidence: 1,
    });

    const previewResponse = {
      success: true,
      projectId,
      task,
      agentProvider: "curated-demo" as const,
      agentModel: "gitcode-token-safety-demo",
      memoryProvider: this.memoryService.providerName,
      memoryFallbackUsed: false,
      ragProvider: this.ragService.providerName,
      semanticSearch: this.ragService.providerName === "pgvector",
      memoryInfluence,
      plan,
      memoriesUsed,
      chunksUsed,
      patchPreview,
      testsToRun,
      risks,
      suggestedMemories,
      applyResult: null,
      incrementalRagUpdate: null,
      hindsightRetention: null,
    };

    if (mode === "preview-only") {
      return { ...previewResponse, mode };
    }

    const applyResult = await this.applyDemoPatch(projectId, task.id);
    return {
      ...previewResponse,
      mode,
      task: applyResult.task ?? task,
      applyResult,
      incrementalRagUpdate: applyResult.incrementalRagUpdate ?? null,
      hindsightRetention: applyResult.hindsightRetention ?? null,
      savedMemories: applyResult.savedMemories ?? [],
      memoryProvider: applyResult.memoryProvider ?? this.memoryService.providerName,
      memoryFallbackUsed: Boolean(applyResult.memoryFallbackUsed),
    };
  }

  private async collectRagContext(projectId: ProjectId, query: string): Promise<ScoredRagChunk[]> {
    const searched = await this.ragService.search(projectId, query, 8);
    const listed = await this.ragService.listChunks(projectId);
    const priority = new Set(["popup.js", "popup.css", "background.js", "content.js"]);
    const fileChunks = listed
      .filter((chunk) => priority.has(chunk.filePath))
      .map((chunk, index) => ({ ...chunk, score: Math.max(0.05, 0.2 - index * 0.01) }));
    const byId = new Map<string, ScoredRagChunk>();
    for (const chunk of [...fileChunks, ...searched]) {
      if (!byId.has(chunk.id)) byId.set(chunk.id, chunk);
    }
    return [...byId.values()].slice(0, 8);
  }

  private buildPatchPreview(projectId: ProjectId, chunks: RagChunk[]): ExecutablePatch[] {
    const popupJs = this.reconstructFile(chunks, "popup.js") || this.syntheticPopupJs();
    const popupCss = this.reconstructFile(chunks, "popup.css") || "";
    const patches: ExecutablePatch[] = [this.popupJsPatch(projectId, popupJs)];
    if (popupCss || chunks.some((chunk) => chunk.filePath === "popup.css")) {
      patches.push(this.popupCssPatch(projectId, popupCss));
    }
    return patches;
  }

  private popupJsPatch(_projectId: string, content: string): ExecutablePatch {
    const marker = "DevContext GitHub token safety guard";
    const alreadyPatched = content.includes(marker);
    const guardBlock = `

// ${marker}
(function installDevContextGitHubTokenGuard() {
  const WARNING_ID = "devcontext-github-token-warning";
  const TOKEN_KEYS = ["githubToken", "github_token", "GITHUB_TOKEN", "token"];
  const WARNING_TEXT = "GitHub token is not configured. Add it in settings before using GitHub features.";

  function readStoredToken() {
    return new Promise((resolve) => {
      if (!globalThis.chrome?.storage?.local) {
        resolve("");
        return;
      }
      chrome.storage.local.get(TOKEN_KEYS, (values) => {
        const token = TOKEN_KEYS.map((key) => values?.[key]).find((value) => typeof value === "string" && value.trim().length > 0);
        resolve(token || "");
      });
    });
  }

  function showGitHubTokenWarning() {
    let warning = document.getElementById(WARNING_ID);
    if (!warning) {
      warning = document.createElement("div");
      warning.id = WARNING_ID;
      warning.className = "devcontext-token-warning";
      warning.setAttribute("role", "alert");
      document.body.prepend(warning);
    }
    warning.textContent = WARNING_TEXT;
  }

  async function hasGitHubToken() {
    const token = await readStoredToken();
    return Boolean(token);
  }

  document.addEventListener(
    "click",
    async (event) => {
      const target = event.target instanceof Element ? event.target.closest("button, a, [data-github-action]") : null;
      if (!target) return;
      const actionText = [target.textContent || "", target.getAttribute("id") || "", target.getAttribute("class") || "", target.getAttribute("data-github-action") || ""].join(" ");
      if (!/github|repository|repo|pull request|issue/i.test(actionText)) return;
      if (await hasGitHubToken()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showGitHubTokenWarning();
    },
    true,
  );

  window.devcontextGitHubTokenGuard = { hasGitHubToken, showGitHubTokenWarning };
})();
`;
    const newContent = alreadyPatched ? content : `${content.trimEnd()}\n${guardBlock}`;
    return {
      filePath: "popup.js",
      status: "modified",
      originalContentSnippet: content.slice(0, 1200),
      newContent,
      changeSummary: "Add a GitHub token presence guard for popup GitHub actions and show a clear warning when missing.",
      diff: [
        "--- popup.js",
        "+++ popup.js",
        "@@ DevContext curated demo @@",
        "+// DevContext GitHub token safety guard",
        "+const WARNING_TEXT = \"GitHub token is not configured. Add it in settings before using GitHub features.\";",
        "+document.addEventListener(\"click\", async (event) => {",
        "+  // Block GitHub-related popup actions when no token is configured.",
        "+});",
      ].join("\n"),
      risk: "The guard is intentionally scoped to GitHub-related popup controls and does not log token values.",
    };
  }

  private popupCssPatch(_projectId: string, content: string): ExecutablePatch {
    const cssBlock = `

.devcontext-token-warning {
  margin: 10px 0;
  padding: 10px 12px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  background: #451a03;
  color: #fffbeb;
  font-size: 13px;
  line-height: 1.4;
}
`;
    const newContent = content.includes(".devcontext-token-warning") ? content : `${content.trimEnd()}${cssBlock}`;
    return {
      filePath: "popup.css",
      status: content ? "modified" : "added",
      originalContentSnippet: content.slice(0, 1200),
      newContent,
      changeSummary: "Add warning styling for the missing GitHub token message in the extension popup.",
      diff: [
        "--- popup.css",
        "+++ popup.css",
        "@@ DevContext curated demo @@",
        "+.devcontext-token-warning {",
        "+  border: 1px solid #f59e0b;",
        "+  background: #451a03;",
        "+  color: #fffbeb;",
        "+}",
      ].join("\n"),
      risk: "Visual styling should be checked against the existing popup layout.",
    };
  }

  private async applyDemoPatch(projectId: ProjectId, taskId: string) {
    const task = this.taskService.getTask(projectId, taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    const project = await this.projectService.getProject(projectId);
    const branchName = `devcontext/gitcode-token-safety-${task.id.replace(/^task-/, "").slice(0, 8)}`;
    const files = task.patchPreview.slice(0, 3).map((patch) => ({ path: patch.filePath, content: patch.newContent }));

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

    this.taskService.updateTask(projectId, taskId, { status: "approved" });
    try {
      const result = await this.githubWriteService.applyPatch({
        owner: project.owner,
        repo: project.repoName,
        baseBranch: project.defaultBranch,
        branchName,
        title: DEMO_TITLE,
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
      const memoryResult = await this.retainDemoMemories(projectId, taskId, incrementalRagUpdate);
      return {
        success: true,
        task: updatedTask,
        branchName: result.branchName,
        commitSha: result.commitSha,
        prUrl: result.prUrl,
        memoryRetained: memoryResult.retained,
        memoryProvider: memoryResult.provider,
        memoryFallbackUsed: memoryResult.fallbackUsed,
        savedMemories: memoryResult.savedMemories,
        hindsightRetention: memoryResult.hindsightRetention,
        incrementalRagUpdate,
      };
    } catch (error) {
      const failedTask = this.taskService.updateTask(projectId, taskId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Demo patch apply failed",
      }) as GeneratedTask;
      return {
        success: false,
        reason: failedTask.error ?? "Demo patch apply failed",
        patchPreview: task.patchPreview,
        task: failedTask,
      };
    }
  }

  private async updateRagAfterApply(
    projectId: string,
    task: GeneratedTask,
    owner?: string,
    repo?: string,
    branchName?: string,
  ): Promise<IncrementalRagUpdateResult> {
    const warnings: string[] = [];
    const changedFiles = [];
    for (const patch of task.patchPreview.slice(0, 3)) {
      if (this.githubWriteService.isMockWrite()) {
        changedFiles.push({ filePath: patch.filePath, status: patch.status, content: patch.newContent });
        continue;
      }
      if (!owner || !repo || !branchName) {
        warnings.push(`GitHub project metadata missing for ${patch.filePath}; skipped incremental RAG update.`);
        continue;
      }
      const content = await this.githubWriteService.getFileContent(owner, repo, patch.filePath, branchName);
      changedFiles.push({ filePath: patch.filePath, status: patch.status, content });
    }
    const result = await this.ragService.updateChangedFiles(projectId, changedFiles);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }

  private async retainDemoMemories(projectId: string, taskId: string, ragUpdate: IncrementalRagUpdateResult) {
    const task = this.taskService.getTask(projectId, taskId);
    const existing = await this.memoryService.list(projectId);
    const candidates = this.demoMemories(task?.filesTouched ?? ["popup.js", "popup.css"]).map((memory) => {
      if (memory.type !== "task") return memory;
      return {
        ...memory,
        content: `${memory.content} Changed-file RAG refresh covered ${ragUpdate.filesUpdated} file(s) and ${ragUpdate.filesDeleted} deletion(s) using ${ragUpdate.provider}; future searches should find the token guard in the updated popup files.`,
      };
    });
    const selected = this.memoryQuality.selectForTask(candidates, existing);
    const savedMemories: Memory[] = [];
    const retainedReport: HindsightRetentionReport["retained"] = [];
    const skippedReport: HindsightRetentionReport["skipped"] = [];
    let fallbackUsed = false;
    let provider = this.memoryService.providerName;
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
      const retained = await this.memoryService.retain(projectId, { ...decision.candidate, memoryKey: decision.normalizedKey });
      savedMemories.push(retained);
      fallbackUsed = fallbackUsed || Boolean(retained.fallbackUsed);
      provider = retained.provider ?? provider;
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

  private demoMemories(filesTouched: string[]): MemoryDraft[] {
    const files = filesTouched.length > 0 ? filesTouched : ["popup.js", "popup.css"];
    return [
      {
        type: "task",
        title: DEMO_TITLE,
        content:
          "GitCode now has a GitHub token safety guard in the Chrome extension popup. GitHub-related actions warn when the token is missing instead of failing silently. Files changed: popup.js, popup.css. Future GitHub API changes should preserve token secrecy and avoid logging token values.",
        relatedFiles: files,
        tags: ["task", "patch", "rag-updated", "github-pr", "security"],
      },
      {
        type: "risk",
        title: "GitHub token handling risk",
        content:
          "GitCode stores/uses GitHub tokens in the browser extension context. Future changes should avoid logging token values and should show clear user-facing warnings when tokens are missing.",
        relatedFiles: files,
        tags: ["risk", "token", "security"],
      },
    ];
  }

  private pullRequestBody(task: GeneratedTask): string {
    return [
      "## Task Summary",
      "Add a GitHub token safety guard so GitHub-related popup actions warn when no token is configured.",
      "",
      "## Files Changed",
      ...(task.filesTouched ?? []).map((file) => `- ${file}`),
      "",
      "## RAG Chunks Used",
      ...(task.chunksUsed ?? []).map((chunk) => `- ${chunk.filePath}: ${chunk.summary}`),
      "",
      "## Hindsight Memories Used",
      ...(task.memoriesUsed ?? []).map((memory) => `- ${memory.title}: ${memory.type}`),
      "",
      "## RAG Update Summary",
      "After apply, DevContext OS incrementally updates only changed file chunks.",
      "",
      "## Hindsight Memories Saved",
      "- Task outcome: Add GitHub token safety guard",
      "- Risk: GitHub token handling risk",
      "",
      "Generated by DevContext OS curated demo task.",
    ].join("\n");
  }

  private buildMemoryInfluence(memories: ScoredMemory[]): string {
    if (memories.length === 0) {
      return "No prior Hindsight token memory was recalled, so the demo applies the project safety policy directly: do not expose tokens and show clear user-facing warnings.";
    }
    return memories
      .slice(0, 3)
      .map((memory) => `${memory.title} matters because ${memory.content.slice(0, 180)}`)
      .join("\n");
  }

  private reconstructFile(chunks: RagChunk[], filePath: string): string {
    const fileChunks = chunks
      .filter((chunk) => chunk.filePath === filePath)
      .sort((a, b) => (a.startLine ?? 0) - (b.startLine ?? 0));
    if (fileChunks.length === 0) return "";
    const lines = new Map<number, string>();
    for (const chunk of fileChunks) {
      const startLine = chunk.startLine ?? 1;
      chunk.content.split(/\r?\n/).forEach((line, index) => {
        lines.set(startLine + index, line);
      });
    }
    return [...lines.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, line]) => line)
      .join("\n");
  }

  private syntheticPopupJs(): string {
    return [
      "document.addEventListener('DOMContentLoaded', () => {",
      "  // Existing popup initialization lives here.",
      "});",
    ].join("\n");
  }
}
