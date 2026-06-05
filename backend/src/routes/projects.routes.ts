import { Router } from "express";
import { seedProject, seedProjects } from "../data/seed-project";
import { GraphService } from "../services/graph.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";

export function createProjectsRouter(
  ragService: LocalRagService,
  memoryService: LocalMemoryService,
  graphService: GraphService,
): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(seedProjects);
  });

  router.get("/demo-shopease", async (_req, res, next) => {
    try {
      res.json({
        ...seedProject,
        memoryCount: await memoryService.count("demo-shopease"),
        chunkCount: ragService.count("demo-shopease"),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/demo-shopease/memory", async (_req, res, next) => {
    try {
      res.json({ memories: await memoryService.list("demo-shopease") });
    } catch (error) {
      next(error);
    }
  });

  router.get("/demo-shopease/graph", (_req, res) => {
    res.json(graphService.getProjectGraph());
  });

  return router;
}
