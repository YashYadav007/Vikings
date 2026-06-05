import { Router } from "express";
import { z } from "zod";
import { LocalRagService } from "../services/local-rag.service";

const ragSearchSchema = z.object({
  projectId: z.literal("demo-shopease"),
  query: z.string().min(1),
});

export function createRagRouter(ragService: LocalRagService): Router {
  const router = Router();

  router.post("/search", (req, res, next) => {
    try {
      const body = ragSearchSchema.parse(req.body);
      res.json({ chunks: ragService.search(body.projectId, body.query) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
