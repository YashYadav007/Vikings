import { Router } from "express";
import { z } from "zod";
import { TaskService } from "../services/task.service";

const projectParamSchema = z.object({
  projectId: z.string().min(1),
});

export function createTasksRouter(taskService: TaskService): Router {
  const router = Router();

  router.get("/:projectId", (req, res, next) => {
    try {
      const params = projectParamSchema.parse(req.params);
      res.json({ projectId: params.projectId, tasks: taskService.list(params.projectId) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
