import { Router } from "express";
import { z } from "zod";
import { LocalRagService } from "../services/local-rag.service";

const ragSearchSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1),
});

export function createRagRouter(ragService: LocalRagService): Router {
  const router = Router();

  router.get("/provider/status", (_req, res) => {
    res.json(ragService.status());
  });

  router.post("/search", async (req, res, next) => {
    try {
      const body = ragSearchSchema.parse(req.body);
      res.json({
        chunks: await ragService.search(body.projectId, body.query),
        provider: ragService.providerName,
        semanticSearch: ragService.providerName === "pgvector",
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/chunks", async (req, res, next) => {
    try {
      res.json({
        projectId: req.params.projectId,
        chunks: await ragService.listChunks(req.params.projectId),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/file-chunks", async (req, res, next) => {
    try {
      const query = z.object({ filePath: z.string().min(1) }).parse(req.query);
      res.json({
        projectId: req.params.projectId,
        filePath: query.filePath,
        chunks: await ragService.listFileChunks(req.params.projectId, query.filePath),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
