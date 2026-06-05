import { Router } from "express";
import { z } from "zod";
import { AgentService } from "../services/agent.service";

const chatSchema = z.object({
  projectId: z.literal("demo-shopease"),
  message: z.string().min(1),
});

export function createChatRouter(agentService: AgentService): Router {
  const router = Router();

  router.post("/generic", async (req, res, next) => {
    try {
      const body = chatSchema.parse(req.body);
      const answer = await agentService.generateGeneric(body.message);
      res.json({ answer });
    } catch (error) {
      next(error);
    }
  });

  router.post("/memory", async (req, res, next) => {
    try {
      const body = chatSchema.parse(req.body);
      const answer = await agentService.generateMemoryPowered(body.projectId, body.message);
      res.json(answer);
    } catch (error) {
      next(error);
    }
  });

  router.post("/compare", async (req, res, next) => {
    try {
      const body = chatSchema.parse(req.body);
      const comparison = await agentService.compare(body.projectId, body.message);
      res.json(comparison);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
