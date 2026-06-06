import { Router } from "express";
import { z } from "zod";
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
      if (error instanceof Error && error.message.startsWith("Project not found:")) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  });

  router.delete("/:projectId", async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const allowSeedDelete = z
        .union([z.literal("true"), z.literal(true)])
        .optional()
        .safeParse((req.query.allowSeedDelete ?? (req.body as { allowSeedDelete?: unknown } | undefined)?.allowSeedDelete) as unknown);

      if (projectId === "demo-shopease") {
        if (!allowSeedDelete.success || allowSeedDelete.data !== true && allowSeedDelete.data !== "true" || process.env.NODE_ENV === "production") {
          res.status(400).json({ error: "Seed demo project cannot be deleted." });
          return;
        }
      } else {
        const existing = projectService.findImportedProject(projectId);
        if (!existing) {
          res.status(404).json({ error: "Imported project not found." });
          return;
        }
      }

      const projectDeleted = projectService.deleteImportedProject(projectId);
      const warnings: string[] = [];
      const ragChunksCleared = await ragService.clearProjectChunksWithCount(projectId);
      const localMemoriesCleared = memoryService.clearProject(projectId);
      const tasksCleared = taskService.clearProject(projectId);

      if (memoryService.providerName === "hindsight") {
        warnings.push(
          "Hindsight remote delete is not supported; project data was removed locally and from RAG. Use a new HINDSIGHT_DEMO_SESSION_ID for clean demo memory.",
        );
      }

      res.json({
        success: true,
        projectId,
        deleted: {
          project: projectDeleted,
          ragChunks: ragChunksCleared,
          tasks: tasksCleared,
          localMemories: localMemoriesCleared,
          cache: projectDeleted,
        },
        hindsight: {
          provider: memoryService.providerName,
          remoteDeleteSupported: false,
          action:
            memoryService.providerName === "hindsight"
              ? "remote memories not deleted; project will no longer be recalled locally after the project record is gone"
              : "local runtime memories deleted",
        },
        warnings,
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

  router.get("/:projectId/context-debug", async (req, res, next) => {
    try {
      const project = await projectService.getProject(req.params.projectId);
      const [chunks, architectureMemories] = await Promise.all([
        ragService.listChunks(req.params.projectId),
        memoryService.recall(req.params.projectId, "Initial repo architecture architecture semantic RAG pgvector", 8),
      ]);

      res.json({
        projectId: req.params.projectId,
        projectArchitecture: project.architecture ?? null,
        ragProviderStatus: ragService.status(),
        chunkCountFromProject: project.chunkCount ?? 0,
        chunkCountFromProvider: chunks.length,
        topChunksPreview: chunks.slice(0, 5).map((chunk) => ({
          id: chunk.id,
          filePath: chunk.filePath,
          module: chunk.module,
          summary: chunk.summary,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          source: chunk.source,
        })),
        memoryProvider: memoryService.providerName,
        recalledArchitectureMemories: architectureMemories
          .filter((memory) => memory.type === "architecture" || /architecture/i.test(memory.title))
          .map((memory) => ({
            id: memory.id,
            type: memory.type,
            title: memory.title,
            content: memory.content,
            relatedFiles: memory.relatedFiles,
            score: memory.score,
          })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId/graph", async (req, res, next) => {
    try {
      const project = await projectService.getProject(req.params.projectId);
      const [memories, tasks, chunks] = await Promise.all([
        memoryService.list(req.params.projectId),
        Promise.resolve(taskService.list(req.params.projectId)),
        ragService.listChunks(req.params.projectId),
      ]);
      res.json(graphService.getProjectGraph(project, memories, tasks, chunks));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
