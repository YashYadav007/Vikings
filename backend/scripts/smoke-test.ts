const baseUrl = process.env.BASE_URL ?? "http://localhost:4000";

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
        body: JSON.stringify({
          projectId: "demo-shopease",
          memory: {
            type: "decision",
            title: retainedTitle,
            content: "Smoke test retained memory persists through the local JSON provider.",
            relatedFiles: ["src/lib/cartService.ts"],
          },
        }),
      });
      expect(result.success === true, "Expected success true");
      expect((result.memory as { title?: string }).title === retainedTitle, "Expected retained memory title");
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
];

async function main() {
  let failures = 0;

  for (const check of checks) {
    try {
      await check.run();
      console.log(`PASS ${check.name}`);
    } catch (error) {
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
