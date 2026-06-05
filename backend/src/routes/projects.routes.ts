import { Router } from "express";
import { GraphService } from "../services/graph.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";
import { ProjectService } from "../services/project.service";
import { TaskService } from "../services/task.service";

export function createProjectsRouter(
  projectService: ProjectService,
  ragService: LocalRagService,
  memoryService: LocalMemoryService,
  graphService: GraphService,
  taskService: TaskService,
): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      res.json(await projectService.listProjects());
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId", async (req, res, next) => {
    try {
      res.json(await projectService.getProject(req.params.projectId));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:projectId", (req, res, next) => {
    try {
      const { projectId } = req.params;
      if (projectId === "demo-shopease") {
        res.status(400).json({ error: "Seed demo project cannot be deleted." });
        return;
      }

      const projectDeleted = projectService.deleteImportedProject(projectId);
      const chunksCleared = ragService.clearProjectChunksWithCount(projectId);
      const memoriesCleared = memoryService.clearProject(projectId);
      const tasksCleared = taskService.clearProject(projectId);

      res.json({
        success: true,
        deleted: {
          project: projectDeleted,
          chunks: chunksCleared,
          memories: memoriesCleared,
          tasks: tasksCleared,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/memory", async (req, res, next) => {
    try {
      await projectService.getProject(req.params.projectId);
      res.json({ memories: await memoryService.list(req.params.projectId) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/graph", async (req, res, next) => {
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
