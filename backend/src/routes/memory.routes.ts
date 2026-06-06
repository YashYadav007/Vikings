import { Router } from "express";
import { z } from "zod";
import { LocalMemoryService } from "../services/local-memory.service";
import { MemoryQualityService } from "../services/memory/memory-quality.service";

const projectParamSchema = z.object({
  projectId: z.string().min(1),
});

const memoryRecallSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1),
});

const memoryDraftSchema = z.object({
  type: z.enum(["bug", "decision", "style", "risk", "preference", "task", "architecture", "follow-up"]),
  title: z.string().min(1),
  content: z.string().min(1),
  relatedFiles: z.array(z.string()),
  tags: z.array(z.string()).optional(),
});

const memoryRetainSchema = z.object({
  projectId: z.string().min(1),
  memory: memoryDraftSchema,
});

const memoryReflectSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1),
  context: z.unknown().optional(),
});

export function createMemoryRouter(memoryService: LocalMemoryService, memoryQuality = new MemoryQualityService()): Router {
  const router = Router();

  router.get("/provider/status", (_req, res) => {
    res.json(memoryService.status());
  });

  router.post("/provider/verify", async (req, res, next) => {
    try {
      const body = z.object({ projectId: z.string().min(1) }).parse(req.body);
      const title = "Hindsight verification memory";
      let fallbackUsed = false;
      let error: string | null = null;

      try {
        const retained = await memoryService.retain(body.projectId, {
          type: "decision",
          title,
          content: "This is a live Hindsight retain/recall verification for DevContext OS.",
          relatedFiles: ["README.md", "background.js"],
          tags: ["task", "rag-updated"],
        });
        fallbackUsed = Boolean(retained.fallbackUsed);
      } catch (retainError) {
        fallbackUsed = true;
        error = retainError instanceof Error ? retainError.message : String(retainError);
      }

      const recalled = await memoryService.recall(body.projectId, title);
      const reflection = await memoryService.reflect(body.projectId, title, { memoriesUsed: recalled });
      const provider = memoryService.providerName;
      const prefix = process.env.HINDSIGHT_PROJECT_PREFIX ?? "devcontext";
      const sessionId = process.env.HINDSIGHT_DEMO_SESSION_ID?.trim();

      res.json({
        provider,
        bankId: sessionId ? `${prefix}:${sessionId}:${body.projectId}` : `${prefix}:${body.projectId}`,
        retainOk: !error,
        recallOk: recalled.length > 0,
        reflectOk: Boolean(reflection.reflection && reflection.reflection.length > 16),
        recalledCount: recalled.length,
        fallbackUsed: fallbackUsed || Boolean(reflection.fallbackReflectionUsed),
        error,
        ...(provider === "local" ? { message: "Using local provider, not real Hindsight." } : {}),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId", async (req, res, next) => {
    try {
      const params = projectParamSchema.parse(req.params);
      res.json({
        projectId: params.projectId,
        provider: memoryService.providerName,
        memories: await memoryService.list(params.projectId),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/learning-summary", async (req, res, next) => {
    try {
      const params = projectParamSchema.parse(req.params);
      const memories = await memoryService.list(params.projectId);
      const report = memoryQuality.qualityReport(params.projectId, memoryService.providerName, memories);
      const usefulMemories = report.recommendedKeep;
      const byType = (type: string) => usefulMemories.filter((memory) => memory.type === type);
      const fileCounts = new Map<string, number>();

      for (const memory of usefulMemories) {
        for (const file of memory.relatedFiles) {
          fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
        }
      }

      res.json({
        projectId: params.projectId,
        provider: memoryService.providerName,
        memoryCount: memories.length,
        usefulCount: report.recommendedKeep.length,
        noisyCount: report.noisyMemories.length,
        duplicateCount: report.duplicateGroups.reduce((total, group) => total + group.count - 1, 0),
        recentTasks: byType("task").slice(-5),
        decisions: byType("decision").slice(-8),
        risks: byType("risk").slice(-8),
        preferences: byType("preference").slice(-8),
        followUps: usefulMemories.filter((memory) => memory.type === "follow-up" || /follow[- ]?up|todo|next/i.test(`${memory.title} ${memory.content}`)).slice(-8),
        architecture: report.latestArchitectureMemory ? [report.latestArchitectureMemory] : [],
        topFilesMentioned: [...fileCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([filePath, count]) => ({ filePath, count })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/quality-report", async (req, res, next) => {
    try {
      const params = projectParamSchema.parse(req.params);
      const memories = await memoryService.list(params.projectId);
      res.json(memoryQuality.qualityReport(params.projectId, memoryService.providerName, memories));
    } catch (error) {
      next(error);
    }
  });

  router.post("/recall", async (req, res, next) => {
    try {
      const body = memoryRecallSchema.parse(req.body);
      res.json({ memories: await memoryService.recall(body.projectId, body.query) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/retain", async (req, res, next) => {
    try {
      const body = memoryRetainSchema.parse(req.body);
      const memory = await memoryService.retain(body.projectId, body.memory);
      res.json({ success: true, memory });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reflect", async (req, res, next) => {
    try {
      const body = memoryReflectSchema.parse(req.body);
      const reflection = await memoryService.reflect(body.projectId, body.query, body.context);
      res.json(reflection);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
