const baseUrl = process.env.BASE_URL ?? "http://localhost:4000";
const hindsightConfigured = Boolean(process.env.HINDSIGHT_API_URL && process.env.HINDSIGHT_API_KEY);
const memoryProvider = process.env.MEMORY_PROVIDER ?? "local";
const ragProvider = process.env.RAG_PROVIDER ?? "local";
const embeddingProvider = process.env.EMBEDDING_PROVIDER ?? "openai";
const embeddingConfigured =
  embeddingProvider === "gemini"
    ? Boolean(process.env.GEMINI_API_KEY)
    : embeddingProvider === "openai"
      ? Boolean(process.env.OPENAI_API_KEY)
      : Boolean(process.env.OLLAMA_BASE_URL);
const pgvectorConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && embeddingConfigured);
const testGitHubRepo = process.env.TEST_GITHUB_REPO;
let importedProjectId: string | null = null;
let executionTaskId: string | null = null;
let learningTaskId: string | null = null;
let chunksBeforeLearning = 0;
const gitCodeProjectId = "github-yashyadav007-gitcode";

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
    name: "GET /api/rag/provider/status",
    run: async () => {
      const result = await request("/api/rag/provider/status");
      expect(result.activeProvider === "local" || result.activeProvider === "pgvector", "Expected active RAG provider");
      expect(typeof result.supabaseConfigured === "boolean", "Expected supabaseConfigured");
      expect(typeof result.embeddingConfigured === "boolean", "Expected embeddingConfigured");
      expect(typeof result.embeddingProvider === "string", "Expected embeddingProvider");
      expect(typeof result.embeddingDimensions === "number", "Expected embeddingDimensions");
    },
  },
  {
    name: "GET /api/system/status",
    run: async () => {
      const result = await request("/api/system/status");
      expect(result.backend === "ok", "Expected backend ok");
      expect(typeof result.memory === "object" && result.memory !== null, "Expected memory status");
      expect(typeof result.rag === "object" && result.rag !== null, "Expected RAG status");
      expect(typeof result.llm === "object" && result.llm !== null, "Expected LLM status");
      expect(typeof result.github === "object" && result.github !== null, "Expected GitHub status");
      expect(typeof result.agent === "object" && result.agent !== null, "Expected agent status");
      expect(typeof result.embeddings === "object" && result.embeddings !== null, "Expected embeddings status");
      expect(typeof result.cache === "object" && result.cache !== null, "Expected cache status");
      const agent = result.agent as { provider?: string; configured?: boolean };
      if (process.env.CODING_AGENT_PROVIDER === "gemini" && !process.env.GEMINI_API_KEY) {
        expect(agent.provider === "gemini", "Expected Gemini agent status");
        expect(agent.configured === false, "Expected Gemini configured=false without key");
      }
    },
  },
  {
    name: "POST /api/memory/provider/verify",
    run: async () => {
      const result = await request("/api/memory/provider/verify", {
        method: "POST",
        body: JSON.stringify({ projectId: "demo-shopease" }),
      });
      expect(result.provider === "local" || result.provider === "hindsight", "Expected memory provider");
      expect(result.retainOk === true, "Expected retainOk");
      expect(result.recallOk === true, "Expected recallOk");
      expect(result.reflectOk === true, "Expected reflectOk");
      expect(typeof result.recalledCount === "number", "Expected recalledCount");
      if (memoryProvider === "hindsight" && hindsightConfigured) {
        expect(result.fallbackUsed === false, "Expected real Hindsight verification without fallback");
      }
    },
  },
  {
    name: "DELETE seed project is protected",
    run: async () => {
      const response = await fetch(`${baseUrl}/api/projects/demo-shopease`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      expect(response.status === 400, "Expected seed project delete to be rejected");
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
      const memoriesUsed = result.memoriesUsed as unknown[];
      if (Array.isArray(memoriesUsed) && memoriesUsed.length > 0) {
        expect(
          !(result.memoryAnswer as string).includes("No durable architecture memory was recalled yet"),
          "Memory answer should not deny recalled memories",
        );
      }
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
      expect(result.reflection !== "I don't have information.", "Expected useful reflection fallback");
      expect((result.reflection as string).length > 32, "Expected non-trivial reflection");
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
    name: "POST /api/tasks/run preview-only",
    run: async () => {
      const result = await request("/api/tasks/run", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          message: "Improve README with setup instructions",
          mode: "preview-only",
        }),
      });
      const task = result.task as { id?: string; status?: string };
      expect(task.status === "patch_generated", "Expected task run patch_generated");
      expect(
        ["mock", "llm", "openai", "gemini", "ollama", "claude-code"].includes(String(result.agentProvider)),
        "Expected agent provider",
      );
      expect(typeof result.memoryInfluence === "string", "Expected memory influence");
      expect(Array.isArray(result.patchPreview), "Expected patch preview");
    },
  },
  {
    name: "Learning loop execute README task",
    run: async () => {
      const chunksBefore = await request("/api/rag/demo-shopease/chunks");
      chunksBeforeLearning = (chunksBefore.chunks as unknown[]).length;

      const result = await request("/api/agent/execute", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          message: "Improve README with setup instructions",
        }),
      });
      const task = result.task as { id?: string; status?: string };
      expect(task.status === "patch_generated", "Expected learning task patch_generated");
      expect(Array.isArray(result.patchPreview), "Expected learning patch preview");
      learningTaskId = task.id ?? null;
    },
  },
  {
    name: "Learning loop apply updates RAG and memory",
    run: async () => {
      if (!learningTaskId) throw new SkipSmokeCheck("No learning task id.");
      const result = await request(`/api/patches/${learningTaskId}/apply`, {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          approve: true,
        }),
      });
      expect(result.success === true, "Expected learning apply success");
      const update = result.incrementalRagUpdate as { filesUpdated?: number; chunksInserted?: number; warnings?: string[] };
      expect(typeof update === "object" && update !== null, "Expected incrementalRagUpdate");
      expect((update.filesUpdated ?? 0) >= 1, "Expected at least one file updated");
      expect((update.chunksInserted ?? 0) >= 1, "Expected at least one chunk inserted");
      expect(result.memoryProvider === "local" || result.memoryProvider === "hindsight", "Expected apply memoryProvider");
      expect(typeof result.memoryFallbackUsed === "boolean", "Expected apply memoryFallbackUsed");
      const retention = result.hindsightRetention as { retained?: unknown[]; skipped?: unknown[]; duplicatesSkipped?: number };
      expect(typeof retention === "object" && retention !== null, "Expected hindsightRetention");
      expect((retention.retained ?? []).length <= 6, "Expected controlled retained memory count");
      expect(typeof retention.duplicatesSkipped === "number", "Expected duplicate skip count");
      expect(result.memoryRetained === true || (retention.duplicatesSkipped ?? 0) > 0, "Expected learning memory retained or duplicate skipped");
    },
  },
  {
    name: "Learning summary includes task memory",
    run: async () => {
      const result = await request("/api/memory/demo-shopease/learning-summary");
      expect(result.projectId === "demo-shopease", "Expected learning summary project");
      expect(typeof result.memoryCount === "number", "Expected memory count");
      expect(typeof result.usefulCount === "number", "Expected useful count");
      expect(typeof result.noisyCount === "number", "Expected noisy count");
      expect(typeof result.duplicateCount === "number", "Expected duplicate count");
      const recentTasks = result.recentTasks as Array<{ title?: string; content?: string }>;
      expect(Array.isArray(recentTasks), "Expected recent tasks");
      expect(
        recentTasks.some((memory) => memory.title === "Improve README with setup instructions"),
        "Expected retained README task memory",
      );
    },
  },
  {
    name: "Memory quality report suppresses noisy RAG logs",
    run: async () => {
      const result = await request("/api/memory/demo-shopease/quality-report");
      expect(result.projectId === "demo-shopease", "Expected quality report project");
      expect(typeof result.totalMemories === "number", "Expected total memories");
      const keep = result.recommendedKeep as Array<{ title?: string; content?: string }>;
      expect(Array.isArray(keep), "Expected recommended keep");
      expect(
        !keep.some((memory) => /assistant updated rag index|project indexed \d+|inserted \d+ semantic chunk/i.test(`${memory.title} ${memory.content}`)),
        "Expected no standalone noisy RAG index memories in useful set",
      );
    },
  },
  {
    name: "Learning loop file chunks endpoint",
    run: async () => {
      const result = await request("/api/rag/demo-shopease/file-chunks?filePath=README.md");
      expect(result.projectId === "demo-shopease", "Expected file chunks project");
      expect(result.filePath === "README.md", "Expected README filePath");
      const chunks = result.chunks as unknown[];
      expect(Array.isArray(chunks), "Expected file chunks array");
      expect(chunks.length > 0, "Expected README chunks after incremental update");

      const allChunks = await request("/api/rag/demo-shopease/chunks");
      expect((allChunks.chunks as unknown[]).length >= chunksBeforeLearning, "Expected full project chunks not cleared");
    },
  },
  {
    name: "Future agent plan includes Memory influence",
    run: async () => {
      const result = await request("/api/agent/execute", {
        method: "POST",
        body: JSON.stringify({
          projectId: "demo-shopease",
          message: "Improve README with setup instructions",
        }),
      });
      expect(typeof result.plan === "string", "Expected future plan");
      expect((result.plan as string).includes("Memory influence"), "Expected memory influence section");
      const memoriesUsed = result.memoriesUsed as unknown[];
      expect(Array.isArray(memoriesUsed), "Expected memoriesUsed array");
      expect(memoriesUsed.length > 0, "Expected future task to recall previous memories");
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
      const project = result.project as { id?: string; chunkCount?: number; architecture?: string };
      const summary = result.importSummary as {
        chunksCreated?: number;
        ragProvider?: string;
        semanticIndex?: boolean;
        memoryProvider?: string;
        memoryFallbackUsed?: boolean;
        cacheHit?: boolean;
        embeddingsGenerated?: number;
        embeddingProvider?: string;
        indexedAt?: string;
      };
      expect(typeof project.id === "string", "Expected imported project id");
      expect((summary.chunksCreated ?? 0) > 0, "Expected imported chunks");
      expect(summary.ragProvider === "local" || summary.ragProvider === "pgvector", "Expected import ragProvider");
      expect(summary.cacheHit === false, "Expected first import to miss cache");
      expect(typeof summary.embeddingsGenerated === "number", "Expected embeddingsGenerated");
      expect(typeof summary.embeddingProvider === "string", "Expected embeddingProvider");
      expect(typeof summary.indexedAt === "string", "Expected indexedAt");
      expect(summary.memoryProvider === "local" || summary.memoryProvider === "hindsight", "Expected import memoryProvider");
      expect(typeof summary.memoryFallbackUsed === "boolean", "Expected import memoryFallbackUsed");
      if (summary.ragProvider === "pgvector" && summary.semanticIndex === true) {
        expect(
          (project.architecture ?? "").includes("semantic RAG chunks using Supabase pgvector"),
          "Expected pgvector architecture text",
        );
        expect(!(project.architecture ?? "").includes("local RAG chunks for keyword search"), "Expected no local keyword architecture text");
      }
      if (ragProvider === "pgvector" && pgvectorConfigured) {
        expect(summary.ragProvider === "pgvector", "Expected pgvector import when configured");
        expect(summary.semanticIndex === true, "Expected semantic index");
      }
      importedProjectId = project.id;
    },
  },
  {
    name: "pgvector optional semantic import/search",
    run: async () => {
      if (ragProvider !== "pgvector" || !pgvectorConfigured) {
        throw new SkipSmokeCheck("RAG_PROVIDER=pgvector with Supabase and embedding provider env vars is not configured.");
      }
      if (!testGitHubRepo || !importedProjectId) {
        throw new SkipSmokeCheck("TEST_GITHUB_REPO is required for pgvector import smoke.");
      }

      const search = await request("/api/rag/search", {
        method: "POST",
        body: JSON.stringify({
          projectId: importedProjectId,
          query: "project architecture entry point",
        }),
      });
      expect(search.provider === "pgvector", "Expected pgvector search provider");
      expect(search.semanticSearch === true, "Expected semantic search metadata");
      expect(Array.isArray(search.chunks), "Expected semantic chunks");
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
      const summary = secondImport.importSummary as {
        projectReused?: boolean;
        memoryRetained?: boolean;
        cacheHit?: boolean;
        reindexed?: boolean;
        embeddingsGenerated?: number;
      };
      expect(summary.projectReused === true, "Expected second import to reuse project");
      expect(summary.cacheHit === true, "Expected second import cache hit");
      expect(summary.reindexed === false, "Expected second import not to reindex");
      expect(summary.embeddingsGenerated === 0, "Expected second import to generate zero embeddings");
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
    name: "GitHub force reindex bypasses cache",
    run: async () => {
      if (!testGitHubRepo || !importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }

      const result = await request("/api/repos/import", {
        method: "POST",
        body: JSON.stringify({ repoUrl: testGitHubRepo, forceReindex: true }),
      });
      const summary = result.importSummary as { cacheHit?: boolean; reindexed?: boolean; filesSkippedUnchanged?: number; embeddingsGenerated?: number };
      expect(summary.cacheHit === false, "Expected force reindex to bypass cache");
      expect(summary.reindexed === true, "Expected force reindex to mark reindexed");
      expect(typeof summary.filesSkippedUnchanged === "number", "Expected filesSkippedUnchanged");
      expect(typeof summary.embeddingsGenerated === "number", "Expected embeddingsGenerated");
    },
  },
  {
    name: "GitHub sync unchanged repo",
    run: async () => {
      if (!importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }

      const result = await request(`/api/repos/${importedProjectId}/sync`, {
        method: "POST",
        body: JSON.stringify({ forceReindex: false }),
      });
      expect(result.projectId === importedProjectId, "Expected sync project id");
      expect(result.syncSkipped === true, "Expected sync skipped for unchanged branch");
      expect(result.cacheHit === true, "Expected sync cache hit");
      expect(result.embeddingsGenerated === 0, "Expected sync to generate zero embeddings");
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
    name: "GET imported project context debug",
    run: async () => {
      if (!importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }
      const result = await request(`/api/projects/${importedProjectId}/context-debug`);
      expect(result.projectId === importedProjectId, "Expected context debug project id");
      expect(typeof result.ragProviderStatus === "object" && result.ragProviderStatus !== null, "Expected RAG provider status");
      expect(typeof result.chunkCountFromProvider === "number", "Expected provider chunk count");
      expect(Array.isArray(result.topChunksPreview), "Expected top chunks preview");
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
      const chunksUsed = result.chunksUsed as Array<{ filePath?: string }>;
      expect(Array.isArray(chunksUsed), "Expected chunksUsed array");
      expect(chunksUsed.length > 0, "Expected imported architecture compare to use chunks");
      expect(
        !(result.memoryAnswer as string).includes("No indexed chunks matched strongly"),
        "Expected memory answer not to deny indexed chunks when chunks are present",
      );
    },
  },
  {
    name: "Delete imported project workflow",
    run: async () => {
      if (!testGitHubRepo || !importedProjectId) {
        throw new SkipSmokeCheck("No imported project from TEST_GITHUB_REPO.");
      }

      const deleted = await request(`/api/projects/${importedProjectId}`, {
        method: "DELETE",
      });
      expect(deleted.success === true, "Expected delete success");
      const deletedReport = deleted.deleted as { project?: boolean; ragChunks?: number; tasks?: number; localMemories?: number; cache?: boolean };
      expect(deletedReport.project === true, "Expected project record deleted");
      expect(typeof deletedReport.ragChunks === "number", "Expected RAG chunk cleanup count");
      expect(typeof deletedReport.tasks === "number", "Expected task cleanup count");
      expect(typeof deletedReport.localMemories === "number", "Expected local memory cleanup count");
      expect(deletedReport.cache === true, "Expected cache cleared");
      expect(typeof deleted.hindsight === "object" && deleted.hindsight !== null, "Expected Hindsight delete report");

      const detail = await fetch(`${baseUrl}/api/projects/${importedProjectId}`);
      expect(detail.status === 404, "Expected deleted project details to return 404");

      const chunks = await request(`/api/rag/${importedProjectId}/chunks`);
      expect(Array.isArray(chunks.chunks), "Expected chunks response after delete");
      expect((chunks.chunks as unknown[]).length === 0, "Expected RAG chunks cleared after delete");

      const reimport = await request("/api/repos/import", {
        method: "POST",
        body: JSON.stringify({ repoUrl: testGitHubRepo }),
      });
      const summary = reimport.importSummary as { cacheHit?: boolean; projectReused?: boolean };
      expect(summary.cacheHit === false, "Expected re-import after delete to be fresh");
      expect(summary.projectReused === false, "Expected re-import after delete not to reuse project");
    },
  },
  {
    name: "Curated GitCode token safety demo",
    run: async () => {
      const projectResponse = await fetch(`${baseUrl}/api/projects/${gitCodeProjectId}`);
      if (projectResponse.status === 404) {
        throw new SkipSmokeCheck("GitCode project is not imported.");
      }
      if (!projectResponse.ok) {
        throw new Error(`GitCode project lookup failed: ${projectResponse.status}`);
      }

      const preview = await request("/api/demo/gitcode-token-safety", {
        method: "POST",
        body: JSON.stringify({ projectId: gitCodeProjectId, mode: "preview-only" }),
      });
      expect(preview.agentProvider === "curated-demo", "Expected curated demo provider");
      const previewPatches = preview.patchPreview as Array<{ filePath?: string }>;
      expect(previewPatches.some((patch) => patch.filePath === "popup.js"), "Expected popup.js patch");

      const applied = await request("/api/demo/gitcode-token-safety", {
        method: "POST",
        body: JSON.stringify({ projectId: gitCodeProjectId, mode: "safe-auto" }),
      });
      const applyResult = applied.applyResult as { success?: boolean; prUrl?: string; incrementalRagUpdate?: unknown };
      expect(applyResult.success === true, "Expected curated demo apply success");
      expect(typeof applyResult.prUrl === "string", "Expected curated demo PR URL");
      const ragUpdate = applied.incrementalRagUpdate as { filesUpdated?: number; chunksInserted?: number };
      expect((ragUpdate.filesUpdated ?? 0) > 0, "Expected curated demo incremental RAG update");
      expect((ragUpdate.chunksInserted ?? 0) > 0, "Expected curated demo chunks inserted");
      const retention = applied.hindsightRetention as { retained?: unknown[]; duplicatesSkipped?: number; skipped?: unknown[] };
      expect((retention.retained ?? []).length > 0 || (retention.duplicatesSkipped ?? 0) > 0, "Expected curated demo Hindsight retain or duplicate skip");

      const learning = await request(`/api/memory/${gitCodeProjectId}/learning-summary`);
      const recentTasks = learning.recentTasks as Array<{ title?: string }>;
      expect(recentTasks.some((memory) => memory.title === "Add GitHub token safety guard"), "Expected token safety task memory");

      const graph = await request(`/api/projects/${gitCodeProjectId}/graph`);
      const nodes = graph.nodes as Array<{ type?: string }>;
      expect(nodes.some((node) => node.type === "pr"), "Expected curated demo PR graph node");
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
