import { createHash } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { ChunkingService } from "../services/chunking.service";
import { FileFilterService } from "../services/file-filter.service";
import { GitHubService } from "../services/github.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";
import { ProjectService } from "../services/project.service";
import { RepoAnalyzerService } from "../services/repo-analyzer.service";
import { ChangedFile, ImportedProject, RepoFile } from "../types";

const importRepoSchema = z.object({
  repoUrl: z.string().url(),
  forceReindex: z.boolean().optional().default(false),
});

const syncRepoSchema = z.object({
  forceReindex: z.boolean().optional().default(false),
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
      const { owner, repo } = githubService.parseGitHubUrl(body.repoUrl);
      const projectId = projectService.createProjectId(owner, repo);
      const existingProject = projectService.findImportedProject(projectId);

      if (existingProject && !body.forceReindex) {
        const project = await projectService.getProject(projectId);
        res.json({
          project,
          importSummary: {
            filesScanned: 0,
            filesIndexed: 0,
            chunksCreated: project.chunkCount ?? existingProject.chunkCount ?? 0,
            memoryRetained: false,
            memoryProvider: memoryService.providerName,
            memoryFallbackUsed: false,
            projectReused: true,
            cacheHit: true,
            reindexed: false,
            embeddingsGenerated: 0,
            filesSkippedUnchanged: Object.keys(existingProject.fileHashes ?? {}).length,
            filesReindexed: 0,
            ragProvider: existingProject.ragProvider ?? ragService.providerName,
            semanticIndex: Boolean(existingProject.semanticIndex),
            embeddingProvider: existingProject.embeddingProvider ?? ragService.status().embeddingProvider,
            embeddingModel: existingProject.embeddingModel ?? ragService.status().embeddingModel,
            embeddingDimensions: existingProject.embeddingDimensions ?? ragService.status().embeddingDimensions,
            indexedAt: existingProject.indexedAt,
            lastIndexedCommitSha: existingProject.lastIndexedCommitSha,
            warnings: [],
          },
        });
        return;
      }

      const result = await indexRepository({
        owner,
        repo,
        forceReindex: body.forceReindex,
        retainArchitectureMemory: true,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof Error && /Invalid GitHub URL|Only github.com/.test(error.message)) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  });

  router.post("/:projectId/sync", async (req, res, next) => {
    try {
      const body = syncRepoSchema.parse(req.body);
      const projectId = z.string().min(1).parse(req.params.projectId);
      const existing = projectService.findImportedProject(projectId);
      if (!existing) {
        res.status(404).json({ error: "Imported project not found" });
        return;
      }

      const latestCommit = await githubService.fetchBranchCommitSha(existing.owner, existing.repoName, existing.defaultBranch);
      if (!body.forceReindex && latestCommit && existing.lastIndexedCommitSha === latestCommit) {
        res.json({
          projectId,
          syncSkipped: true,
          cacheHit: true,
          changedFiles: [],
          filesReindexed: 0,
          filesSkippedUnchanged: Object.keys(existing.fileHashes ?? {}).length,
          embeddingsGenerated: 0,
          ragProvider: existing.ragProvider ?? ragService.providerName,
          semanticIndex: Boolean(existing.semanticIndex),
          embeddingProvider: existing.embeddingProvider ?? ragService.status().embeddingProvider,
          embeddingModel: existing.embeddingModel ?? ragService.status().embeddingModel,
          warnings: [],
        });
        return;
      }

      const indexed = await indexRepository({
        owner: existing.owner,
        repo: existing.repoName,
        forceReindex: true,
        retainArchitectureMemory: false,
      });
      res.json({
        projectId,
        syncSkipped: false,
        cacheHit: false,
        changedFiles: indexed.importSummary.changedFiles ?? [],
        filesReindexed: indexed.importSummary.filesReindexed ?? 0,
        filesSkippedUnchanged: indexed.importSummary.filesSkippedUnchanged ?? 0,
        embeddingsGenerated: indexed.importSummary.embeddingsGenerated ?? 0,
        ragProvider: indexed.importSummary.ragProvider,
        semanticIndex: indexed.importSummary.semanticIndex,
        embeddingProvider: indexed.importSummary.embeddingProvider,
        embeddingModel: indexed.importSummary.embeddingModel,
        warnings: indexed.importSummary.warnings,
      });
    } catch (error) {
      next(error);
    }
  });

  async function indexRepository(params: {
    owner: string;
    repo: string;
    forceReindex: boolean;
    retainArchitectureMemory: boolean;
  }): Promise<{
    project: unknown;
    importSummary: {
      filesScanned: number;
      filesIndexed: number;
      chunksCreated: number;
      memoryRetained: boolean;
      memoryProvider: "local" | "hindsight";
      memoryFallbackUsed: boolean;
      projectReused: boolean;
      cacheHit: boolean;
      reindexed: boolean;
      embeddingsGenerated: number;
      filesSkippedUnchanged: number;
      filesReindexed: number;
      changedFiles: string[];
      ragProvider: "local" | "pgvector";
      semanticIndex: boolean;
      embeddingProvider?: string;
      embeddingModel?: string;
      embeddingDimensions?: number;
      indexedAt?: string;
      lastIndexedCommitSha?: string;
      warnings: string[];
    };
  }> {
    const warnings: string[] = [];
    const metadata = await githubService.fetchRepoMetadata(params.owner, params.repo);
    const branch = metadata.defaultBranch || (await githubService.fetchDefaultBranch(params.owner, params.repo));
    const projectId = projectService.createProjectId(params.owner, params.repo);
    const existingProject = projectService.findImportedProject(projectId);
    const projectReused = Boolean(existingProject);
    const lastIndexedCommitSha = await githubService.fetchBranchCommitSha(params.owner, params.repo, branch).catch(() => "");
    const tree = await githubService.fetchRepoTree(params.owner, params.repo, branch);
    const filtered = fileFilterService.filter(tree);
    warnings.push(...filtered.warnings);

    const fetchedFiles = await Promise.allSettled(
      filtered.files.map((file) => githubService.fetchFileContent(params.owner, params.repo, file.path, branch)),
    );
    const files: RepoFile[] = [];
    fetchedFiles.forEach((result, index) => {
      if (result.status === "fulfilled") {
        files.push(result.value);
        return;
      }
      warnings.push(`Skipped ${filtered.files[index]?.path}: ${result.reason instanceof Error ? result.reason.message : "fetch failed"}`);
    });

    const nextFileHashes = Object.fromEntries(files.map((file) => [file.path, hashContent(file.content)]));
    const previousFileHashes = existingProject?.fileHashes ?? {};
    const changedFilesForRag: ChangedFile[] = [];
    let filesSkippedUnchanged = 0;
    let filesReindexed = 0;

    for (const file of files) {
      const nextHash = nextFileHashes[file.path];
      if (existingProject && previousFileHashes[file.path] === nextHash) {
        filesSkippedUnchanged += 1;
        continue;
      }
      changedFilesForRag.push({ filePath: file.path, status: previousFileHashes[file.path] ? "modified" : "added", content: file.content });
      filesReindexed += 1;
    }

    for (const oldPath of Object.keys(previousFileHashes)) {
      if (!nextFileHashes[oldPath]) changedFilesForRag.push({ filePath: oldPath, status: "deleted" });
    }

    const chunks = chunkingService.chunkFiles(projectId, files);
    const maxChunks = Number(process.env.MAX_EMBEDDING_CHUNKS_PER_IMPORT ?? 200);
    const limitedChunks = chunks.slice(0, maxChunks);
    if (chunks.length > limitedChunks.length) {
      warnings.push(`Import limited to top ${maxChunks} chunks out of ${chunks.length} generated chunks.`);
    }

    const analysis = repoAnalyzerService.analyze(metadata, files, limitedChunks);
    let ragProvider: "local" | "pgvector" = ragService.providerName;
    let semanticIndex = ragService.providerName === "pgvector";
    let chunksIndexed = existingProject?.chunkCount ?? 0;
    let embeddingsGenerated = 0;

    if (!existingProject) {
      await ragService.clearProjectChunks(projectId);
      const ragIndexResult = await ragService.indexChunks(projectId, limitedChunks);
      warnings.push(...ragIndexResult.warnings);
      ragProvider = ragIndexResult.provider;
      semanticIndex = ragIndexResult.semanticIndex;
      chunksIndexed = ragIndexResult.chunksIndexed;
      embeddingsGenerated = ragIndexResult.chunksIndexed;
    } else {
      const incremental = await ragService.updateChangedFiles(projectId, changedFilesForRag);
      warnings.push(...incremental.warnings);
      ragProvider = incremental.provider;
      semanticIndex = incremental.semanticIndex;
      chunksIndexed = await ragService.count(projectId);
      embeddingsGenerated = incremental.chunksInserted;
    }

    const ragStatus = ragService.status();
    const now = new Date().toISOString();
    let project: ImportedProject = {
      id: projectId,
      name: metadata.name,
      repoUrl: metadata.repoUrl,
      owner: params.owner,
      repoName: params.repo,
      defaultBranch: branch,
      description: metadata.description,
      stack: analysis.stack,
      modules: analysis.modules,
      architecture: repoAnalyzerService.summarizeImportedArchitecture({
        metadata,
        stack: analysis.stack,
        modules: analysis.modules,
        chunkCount: chunksIndexed,
        ragProvider,
        semanticIndex,
      }),
      riskAreas: analysis.riskAreas,
      lastTask: projectReused ? "Synced public GitHub repository" : "Imported public GitHub repository",
      memoryCount: existingProject?.memoryCount ?? 0,
      chunkCount: chunksIndexed,
      createdAt: existingProject?.createdAt ?? now,
      updatedAt: now,
      lastIndexedCommitSha,
      indexedAt: now,
      ragProvider,
      semanticIndex,
      embeddingProvider: ragStatus.embeddingProvider,
      embeddingModel: ragStatus.embeddingModel,
      embeddingDimensions: ragStatus.embeddingDimensions,
      fileHashes: nextFileHashes,
    };

    const savedProject = projectService.saveImportedProject(project);

    let memoryRetained = false;
    let memoryFallbackUsed = false;
    let memoryProvider = memoryService.providerName;
    if (params.retainArchitectureMemory && !projectReused) {
      try {
        const retainedMemory = await memoryService.retain(projectId, {
          type: "architecture",
          title: "Initial repo architecture",
          content: `${project.architecture}\nImportant files: ${analysis.importantFiles.join(", ") || "none"}.`,
          relatedFiles: analysis.importantFiles,
        });
        memoryRetained = !(retainedMemory as { duplicate?: boolean }).duplicate;
        memoryFallbackUsed = Boolean(retainedMemory.fallbackUsed);
        memoryProvider = retainedMemory.provider ?? memoryService.providerName;
      } catch (error) {
        warnings.push(`Initial architecture memory was not retained: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    const responseProject = await projectService.getProject(savedProject.id);
    return {
      project: responseProject,
      importSummary: {
        filesScanned: tree.length,
        filesIndexed: files.length,
        chunksCreated: chunksIndexed,
        memoryRetained,
        memoryProvider,
        memoryFallbackUsed,
        projectReused,
        cacheHit: false,
        reindexed: projectReused,
        embeddingsGenerated,
        filesSkippedUnchanged,
        filesReindexed,
        changedFiles: changedFilesForRag.map((file) => file.filePath),
        ragProvider,
        semanticIndex,
        embeddingProvider: ragStatus.embeddingProvider,
        embeddingModel: ragStatus.embeddingModel,
        embeddingDimensions: ragStatus.embeddingDimensions,
        indexedAt: now,
        lastIndexedCommitSha,
        warnings,
      },
    };
  }

  return router;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
