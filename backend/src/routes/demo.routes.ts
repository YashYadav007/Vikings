import { Router } from "express";
import { z } from "zod";
import { DemoTaskService } from "../services/demo/demo-task.service";

const demoSchema = z.object({
  projectId: z.string().min(1).default("github-yashyadav007-gitcode"),
  mode: z.enum(["safe-auto", "preview-only"]).default("safe-auto"),
});

export function createDemoRouter(demoTaskService: DemoTaskService): Router {
  const router = Router();

  router.post("/gitcode-token-safety", async (req, res, next) => {
    try {
      const body = demoSchema.parse(req.body);
      res.json(await demoTaskService.runGitCodeTokenSafetyDemo(body.projectId, body.mode));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
