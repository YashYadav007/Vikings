import { Router } from "express";
import { z } from "zod";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";
import { ProjectService } from "../services/project.service";
import { TaskService } from "../services/task.service";

const resetSchema = z.object({
  projectId: z.string().min(1).optional(),
});

export function createDevRouter(
  projectService: ProjectService,
  ragService: LocalRagService,
  memoryService: LocalMemoryService,
  taskService: TaskService,
): Router {
  const router = Router();

  router.post("/reset", (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") {
        res.status(403).json({ error: "Dev reset is disabled in production." });
        return;
      }

      const body = resetSchema.parse(req.body ?? {});

      if (body.projectId) {
        res.json({
          success: true,
          cleared: {
            project: body.projectId === "demo-shopease" ? false : projectService.deleteImportedProject(body.projectId),
            chunks: ragService.clearProjectChunksWithCount(body.projectId),
            memories: memoryService.clearProject(body.projectId),
            tasks: taskService.clearProject(body.projectId),
          },
        });
        return;
      }

      res.json({
        success: true,
        cleared: {
          projects: projectService.clearImportedProjects(),
          chunks: ragService.clearAllImportedChunks(),
          memories: memoryService.clearAllRuntime(),
          tasks: taskService.clearAll(),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
