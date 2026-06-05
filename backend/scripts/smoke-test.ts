const baseUrl = process.env.BASE_URL ?? "http://localhost:4000";
const hindsightConfigured = Boolean(process.env.HINDSIGHT_API_URL && process.env.HINDSIGHT_API_KEY);
const memoryProvider = process.env.MEMORY_PROVIDER ?? "local";
const testGitHubRepo = process.env.TEST_GITHUB_REPO;
let importedProjectId: string | null = null;
let executionTaskId: string | null = null;

class SkipSmokeCheck extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkipSmokeCheck";
  }
}

interface SmokeCheck {
  name: string;
  run: () => Promise<void>;
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(json)}`);
  }

  return json as Record<string, unknown>;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function memoryPayload(title: string) {
  return {
    projectId: "demo-shopease",
    memory: {
      type: "decision",
      title,
      content: "Smoke test retained memory persists through the active DevContext memory provider.",
      relatedFiles: ["src/lib/cartService.ts"],
    },
  };
}

const retainedTitle = `Smoke retained memory ${Date.now()}`;

const checks: SmokeCheck[] = [
  {
    name: "GET /health",
    run: async () => {
      const result = await request("/health");
      expect(result.status === "ok", "Expected status ok");
    },
  },
  {
    name: "GET /api/projects/demo-shopease",
    run: async () => {
      const result = await request("/api/projects/demo-shopease");
      expect(result.id === "demo-shopease", "Expected demo project id");
      expect(typeof result.memoryCount === "number", "Expected memoryCount");
    },
  },
  {
    name: "GET /api/memory/provider/status",
    run: async () => {
      const result = await request("/api/memory/provider/status");
      expect(result.activeProvider === "local" || result.activeProvider === "hindsight", "Expected activeProvider");
      expect(typeof result.bankIdExample === "string", "Expected bankIdExample");
      expect((result.bankIdExample as string).endsWith(":demo-shopease"), "Expected demo bank ID example");
    },
  },
  {
    name: "POST /api/chat/compare",
    run: async () => {
      const result = await request("/api/chat/compare", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          message: "Add coupon discount support",
        }),
      });
      expect(typeof result.genericAnswer === "string", "Expected genericAnswer");
      expect(typeof result.memoryAnswer === "string", "Expected memoryAnswer");
      expect(Array.isArray(result.patchPreview), "Expected patchPreview array");
      expect(Array.isArray(result.memoryToSave), "Expected memoryToSave array");
      expect(result.memoryProvider === "local" || result.memoryProvider === "hindsight", "Expected memoryProvider");
    },
  },
  {
    name: "POST /api/agent/execute",
    run: async () => {
      const result = await request("/api/agent/execute", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          message: "Add coupon discount support",
        }),
      });
      const task = result.task as { id?: string; status?: string };
      expect(task.status === "patch_generated", "Expected patch_generated task");
      expect(typeof result.plan === "string", "Expected plan");
      expect(Array.isArray(result.patchPreview), "Expected patch preview");
      expect(result.requiresApproval === true, "Expected approval requirement");
      executionTaskId = task.id ?? null;
    },
  },
  {
    name: "POST /api/patches/:taskId/apply",
    run: async () => {
      if (!executionTaskId) throw new SkipSmokeCheck("No execution task id.");
      const rejected = await fetch(`${baseUrl}/api/patches/${executionTaskId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "demo-shopease",
          approve: false,
        }),
      });
      expect(rejected.status === 400, "Expected approve=false to be rejected");

      const result = await request(`/api/patches/${executionTaskId}/apply`, {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          approve: true,
        }),
      });
      expect(result.success === true, "Expected mock apply success");
      expect(typeof result.branchName === "string", "Expected branchName");
      expect(typeof result.commitSha === "string", "Expected commitSha");
      expect(typeof result.prUrl === "string", "Expected prUrl");
    },
  },
  {
    name: "GET /api/tasks/:projectId/:taskId",
    run: async () => {
      if (!executionTaskId) throw new SkipSmokeCheck("No execution task id.");
      const result = await request(`/api/tasks/demo-shopease/${executionTaskId}`);
      const task = result.task as { id?: string; prUrl?: string };
      expect(task.id === executionTaskId, "Expected task details");
      expect(typeof task.prUrl === "string", "Expected task PR URL after apply");
    },
  },
  {
    name: "Graph includes applied task PR node",
    run: async () => {
      const result = await request("/api/projects/demo-shopease/graph");
      const nodes = result.nodes as Array<{ type?: string }>;
      expect(nodes.some((node) => node.type === "pr"), "Expected PR node in graph");
    },
  },
  {
    name: "GET /api/projects/demo-shopease/graph",
    run: async () => {
      const result = await request("/api/projects/demo-shopease/graph");
      expect(Array.isArray(result.nodes), "Expected nodes array");
      expect(Array.isArray(result.edges), "Expected edges array");
    },
  },
  {
    name: "GET /api/projects/demo-shopease/memory",
    run: async () => {
      const result = await request("/api/projects/demo-shopease/memory");
      expect(Array.isArray(result.memories), "Expected memories array");
    },
  },
  {
    name: "POST /api/memory/retain",
    run: async () => {
      const result = await request("/api/memory/retain", {
        method: "POST",
        body: JSON.stringify(memoryPayload(retainedTitle)),
      });
      expect(result.success === true, "Expected success true");
      expect((result.memory as { title?: string }).title === retainedTitle, "Expected retained memory title");
    },
  },
  {
    name: "POST /api/memory/recall",
    run: async () => {
      const result = await request("/api/memory/recall", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          query: "coupon calculation order",
        }),
      });
      expect(Array.isArray(result.memories), "Expected memories array");
    },
  },
  {
    name: "POST /api/memory/reflect",
    run: async () => {
      const result = await request("/api/memory/reflect", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          query: "What should we remember after adding coupon support?",
          context: {
            task: "Add coupon support",
            filesTouched: ["src/lib/cartService.ts"],
            memoriesUsed: ["Coupon calculation order"],
          },
        }),
      });
      expect(result.provider === "local" || result.provider === "hindsight", "Expected reflection provider");
      expect(typeof result.reflection === "string", "Expected reflection string");
      expect(Array.isArray(result.suggestedMemories), "Expected suggestedMemories array");
    },
  },
  {
    name: "GET /api/memory/demo-shopease",
    run: async () => {
      const result = await request("/api/memory/demo-shopease");
      expect(result.projectId === "demo-shopease", "Expected projectId");
      expect(result.provider === "local" || result.provider === "hindsight", "Expected provider");
      const memories = result.memories as Array<{ title?: string }>;
      expect(Array.isArray(memories), "Expected memories array");
      expect(memories.some((memory) => memory.title === retainedTitle), "Expected retained memory to persist");
    },
  },
  {
    name: "Hindsight configured retain/recall path",
    run: async () => {
      if (memoryProvider !== "hindsight" || !hindsightConfigured) {
        throw new SkipSmokeCheck("MEMORY_PROVIDER=hindsight with HINDSIGHT_API_URL and HINDSIGHT_API_KEY is not configured.");
      }

      const title = `Hindsight smoke memory ${Date.now()}`;
      await request("/api/memory/retain", {
        method: "POST",
        body: JSON.stringify(memoryPayload(title)),
      });
      const recall = await request("/api/memory/recall", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          query: title,
        }),
      });
      expect(Array.isArray(recall.memories), "Expected Hindsight recall memories array");
    },
  },
  {
    name: "GitHub import optional path",
    run: async () => {
      if (!testGitHubRepo) {
        throw new SkipSmokeCheck("TEST_GITHUB_REPO is not configured.");
      }

      const result = await request("/api/repos/import", {
        method: "POST",
        body: JSON.stringify({ repoUrl: testGitHubRepo }),
      });
      const project = result.project as { id?: string; chunkCount?: number };
      const summary = result.importSummary as { chunksCreated?: number };
      expect(typeof project.id === "string", "Expected imported project id");
      expect((summary.chunksCreated ?? 0) > 0, "Expected imported chunks");
      importedProjectId = project.id;
    },
  },
  {
    name: "GitHub import idempotency",
    run: async () => {
      if (!testGitHubRepo || !importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }

      const beforeMemory = await request(`/api/memory/${importedProjectId}`);
      const beforeArchitectureCount = ((beforeMemory.memories as Array<{ type?: string; title?: string }>) ?? []).filter(
        (memory) => memory.type === "architecture" && memory.title === "Initial repo architecture",
      ).length;

      const secondImport = await request("/api/repos/import", {
        method: "POST",
        body: JSON.stringify({ repoUrl: testGitHubRepo }),
      });
      const summary = secondImport.importSummary as { projectReused?: boolean; memoryRetained?: boolean };
      expect(summary.projectReused === true, "Expected second import to reuse project");
      expect(summary.memoryRetained === false, "Expected duplicate architecture memory to be skipped");

      const afterMemory = await request(`/api/memory/${importedProjectId}`);
      const afterArchitectureCount = ((afterMemory.memories as Array<{ type?: string; title?: string }>) ?? []).filter(
        (memory) => memory.type === "architecture" && memory.title === "Initial repo architecture",
      ).length;
      expect(afterArchitectureCount === beforeArchitectureCount, "Expected architecture memory count to remain stable");

      const graph = await request(`/api/projects/${importedProjectId}/graph`);
      const architectureNodes = ((graph.nodes as Array<{ type?: string; data?: { label?: string } }>) ?? []).filter(
        (node) => node.type === "memory" && node.data?.label?.startsWith("Architecture: Initial repo architecture"),
      );
      expect(architectureNodes.length <= 1, "Expected graph to dedupe architecture memory nodes");
    },
  },
  {
    name: "GET imported project",
    run: async () => {
      if (!importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }
      const result = await request(`/api/projects/${importedProjectId}`);
      expect(result.id === importedProjectId, "Expected imported project details");
    },
  },
  {
    name: "POST imported project RAG search",
    run: async () => {
      if (!importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }
      const result = await request("/api/rag/search", {
        method: "POST",
        body: JSON.stringify({
          projectId: importedProjectId,
          query: "README package source",
        }),
      });
      expect(Array.isArray(result.chunks), "Expected imported RAG chunks array");
    },
  },
  {
    name: "GET imported project RAG chunks",
    run: async () => {
      if (!importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }
      const result = await request(`/api/rag/${importedProjectId}/chunks`);
      expect(result.projectId === importedProjectId, "Expected imported chunk project id");
      expect(Array.isArray(result.chunks), "Expected imported chunks array");
    },
  },
  {
    name: "GET imported project graph",
    run: async () => {
      if (!importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }
      const result = await request(`/api/projects/${importedProjectId}/graph`);
      expect(Array.isArray(result.nodes), "Expected imported graph nodes");
      expect(Array.isArray(result.edges), "Expected imported graph edges");
    },
  },
  {
    name: "POST imported project chat compare",
    run: async () => {
      if (!importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }
      const result = await request("/api/chat/compare", {
        method: "POST",
        body: JSON.stringify({
          projectId: importedProjectId,
          message: "Summarize the project architecture",
        }),
      });
      expect(typeof result.genericAnswer === "string", "Expected imported generic answer");
      expect(typeof result.memoryAnswer === "string", "Expected imported memory answer");
    },
  },
];

async function main() {
  let failures = 0;

  for (const check of checks) {
    try {
      await check.run();
      console.log(`PASS ${check.name}`);
    } catch (error) {
      if (error instanceof SkipSmokeCheck) {
        console.log(`SKIPPED ${check.name}: ${error.message}`);
        continue;
      }

      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAIL ${check.name}: ${message}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

void main();
