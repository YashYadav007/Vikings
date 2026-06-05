import { Router } from "express";
import { z } from "zod";
import { LocalMemoryService } from "../services/local-memory.service";

const projectParamSchema = z.object({
  projectId: z.literal("demo-shopease"),
});

const memoryRecallSchema = z.object({
  projectId: z.literal("demo-shopease"),
  query: z.string().min(1),
});

const memoryDraftSchema = z.object({
  type: z.enum(["bug", "decision", "style", "risk", "preference", "task"]),
  title: z.string().min(1),
  content: z.string().min(1),
  relatedFiles: z.array(z.string()),
});

const memoryRetainSchema = z.object({
  projectId: z.literal("demo-shopease"),
  memory: memoryDraftSchema,
});

const memoryReflectSchema = z.object({
  projectId: z.literal("demo-shopease"),
  query: z.string().min(1),
  context: z.unknown().optional(),
});

export function createMemoryRouter(memoryService: LocalMemoryService): Router {
  const router = Router();

  router.get("/provider/status", (_req, res) => {
    res.json(memoryService.status());
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
