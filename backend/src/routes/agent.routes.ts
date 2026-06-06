import { Router } from "express";
import { z } from "zod";
import { AgentExecutionService } from "../services/agent-execution.service";

const executeSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1),
  mode: z.enum(["safe-auto", "preview-only"]).optional(),
});

export function createAgentRouter(agentExecutionService: AgentExecutionService): Router {
  const router = Router();

  router.post("/execute", async (req, res, next) => {
    try {
      const body = executeSchema.parse(req.body);
      res.json(await agentExecutionService.createExecutionPlan(body.projectId, body.message));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
