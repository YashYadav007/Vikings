import { Router } from "express";
import { z } from "zod";
import { ChunkingService } from "../services/chunking.service";
import { FileFilterService } from "../services/file-filter.service";
import { GitHubService } from "../services/github.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";
import { ProjectService } from "../services/project.service";
import { RepoAnalyzerService } from "../services/repo-analyzer.service";
import { ImportedProject, RepoFile } from "../types";

const importRepoSchema = z.object({
  repoUrl: z.string().url(),
});

export function createReposRouter(
  githubService: GitHubService,
  fileFilterService: FileFilterService,
  chunkingService: ChunkingService,
  repoAnalyzerService: RepoAnalyzerService,
  projectService: ProjectService,
  ragService: LocalRagService,
  memoryService: LocalMemoryService,
): Router {
  const router = Router();

  router.post("/import", async (req, res, next) => {
    try {
      const body = importRepoSchema.parse(req.body);
      const warnings: string[] = [];
      const { owner, repo } = githubService.parseGitHubUrl(body.repoUrl);
      const metadata = await githubService.fetchRepoMetadata(owner, repo);
      const branch = metadata.defaultBranch || (await githubService.fetchDefaultBranch(owner, repo));
      const tree = await githubService.fetchRepoTree(owner, repo, branch);
      const filtered = fileFilterService.filter(tree);
      warnings.push(...filtered.warnings);

      const fetchedFiles = await Promise.allSettled(
        filtered.files.map((file) => githubService.fetchFileContent(owner, repo, file.path, branch)),
      );
      const files: RepoFile[] = [];

      fetchedFiles.forEach((result, index) => {
        if (result.status === "fulfilled") {
          files.push(result.value);
          return;
        }
        warnings.push(`Skipped ${filtered.files[index]?.path}: ${result.reason instanceof Error ? result.reason.message : "fetch failed"}`);
      });

      const projectId = projectService.createProjectId(owner, repo);
      const projectReused = projectService.importedProjectExists(projectId);
      const chunks = chunkingService.chunkFiles(projectId, files);
      const analysis = repoAnalyzerService.analyze(metadata, files, chunks);
      const now = new Date().toISOString();
      const project: ImportedProject = {
        id: projectId,
        name: metadata.name,
        repoUrl: metadata.repoUrl,
        owner,
        repoName: repo,
        defaultBranch: branch,
        description: metadata.description,
        stack: analysis.stack,
        modules: analysis.modules,
        architecture: analysis.architecture,
        riskAreas: analysis.riskAreas,
        lastTask: "Imported public GitHub repository",
        memoryCount: 0,
        chunkCount: chunks.length,
        createdAt: now,
        updatedAt: now,
      };

      await ragService.clearProjectChunks(projectId);
      const ragIndexResult = await ragService.indexChunks(projectId, chunks);
      warnings.push(...ragIndexResult.warnings);
      const savedProject = projectService.saveImportedProject(project);

      let memoryRetained = false;
      try {
        const retainedMemory = await memoryService.retain(projectId, {
          type: "architecture",
          title: "Initial repo architecture",
          content: `${analysis.architecture}\nImportant files: ${analysis.importantFiles.join(", ") || "none"}.`,
          relatedFiles: analysis.importantFiles,
        });
        memoryRetained = !(retainedMemory as { duplicate?: boolean }).duplicate;
      } catch (error) {
        warnings.push(`Initial architecture memory was not retained: ${error instanceof Error ? error.message : "unknown error"}`);
      }

      const responseProject = await projectService.getProject(savedProject.id);
      res.json({
        project: responseProject,
        importSummary: {
          filesScanned: tree.length,
          filesIndexed: files.length,
          chunksCreated: chunks.length,
          memoryRetained,
          projectReused,
          ragProvider: ragIndexResult.provider,
          semanticIndex: ragIndexResult.semanticIndex,
          warnings,
        },
      });
    } catch (error) {
      if (error instanceof Error && /Invalid GitHub URL|Only github.com/.test(error.message)) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  });

  return router;
}
