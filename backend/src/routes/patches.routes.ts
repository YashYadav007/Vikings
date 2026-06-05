import { Router } from "express";
import { z } from "zod";
import { AgentExecutionService } from "../services/agent-execution.service";

const applySchema = z.object({
  projectId: z.string().min(1),
  approve: z.boolean(),
});

export function createPatchesRouter(agentExecutionService: AgentExecutionService): Router {
  const router = Router();

  router.post("/:taskId/apply", async (req, res, next) => {
    try {
      const body = applySchema.parse(req.body);
      if (!body.approve) {
        res.status(400).json({ success: false, reason: "approve=true is required before applying a patch." });
        return;
      }

      res.json(await agentExecutionService.approveAndApplyPatch(body.projectId, req.params.taskId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
