import { Router } from "express";
import { z } from "zod";
import { AgentExecutionService } from "../services/agent-execution.service";
import { TaskService } from "../services/task.service";

const projectParamSchema = z.object({
  projectId: z.string().min(1),
});

const runTaskSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1),
  mode: z.enum(["safe-auto", "preview-only"]).default("preview-only"),
});

export function createTasksRouter(taskService: TaskService, agentExecutionService: AgentExecutionService): Router {
  const router = Router();

  router.post("/run", async (req, res, next) => {
    try {
      const body = runTaskSchema.parse(req.body);
      res.json(await agentExecutionService.runTask(body.projectId, body.message, body.mode));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId", (req, res, next) => {
    try {
      const params = projectParamSchema.parse(req.params);
      res.json({ projectId: params.projectId, tasks: taskService.list(params.projectId) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/:taskId", (req, res, next) => {
    try {
      const params = projectParamSchema.extend({ taskId: z.string().min(1) }).parse(req.params);
      const task = taskService.getTask(params.projectId, params.taskId);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
