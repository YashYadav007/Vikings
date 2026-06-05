import { Router } from "express";
import { GraphService } from "../services/graph.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";
import { ProjectService } from "../services/project.service";
import { TaskService } from "../services/task.service";

export function createGraphRouter(
  graphService: GraphService,
  projectService: ProjectService,
  ragService: LocalRagService,
  memoryService: LocalMemoryService,
  taskService: TaskService,
): Router {
  const router = Router();

  router.get("/:projectId", async (req, res, next) => {
    try {
      const project = await projectService.getProject(req.params.projectId);
      const [memories, tasks] = await Promise.all([
        memoryService.list(req.params.projectId),
        Promise.resolve(taskService.list(req.params.projectId)),
      ]);
      res.json(graphService.getProjectGraph(project, memories, tasks, ragService.listChunks(req.params.projectId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
