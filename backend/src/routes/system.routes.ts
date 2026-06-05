import { Router } from "express";
import { GitHubWriteService } from "../services/github-write.service";
import { LlmService } from "../services/llm.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";

export function createSystemRouter(
  memoryService: LocalMemoryService,
  ragService: LocalRagService,
  llmService: LlmService,
  githubWriteService: GitHubWriteService,
): Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    const memoryStatus = memoryService.status();
    const ragStatus = ragService.status();

    res.json({
      backend: "ok",
      memory: {
        provider: memoryStatus.activeProvider,
        configuredProvider: memoryStatus.configuredProvider,
        hindsightConfigured: memoryStatus.hindsightConfigured,
        fallbackMode: memoryStatus.fallbackMode,
      },
      rag: {
        provider: ragStatus.activeProvider,
        configuredProvider: ragStatus.configuredProvider,
        pgvectorConfigured: ragStatus.pgvectorConfigured,
        supabaseConfigured: ragStatus.supabaseConfigured,
        embeddingConfigured: ragStatus.embeddingConfigured,
        fallbackMode: ragStatus.fallbackMode,
        embeddingModel: ragStatus.embeddingModel,
      },
      llm: {
        mockMode: llmService.isMockMode(),
        openaiConfigured: llmService.isOpenAIConfigured(),
      },
      github: {
        tokenConfigured: githubWriteService.hasToken(),
        mockWrite: githubWriteService.isMockWrite(),
      },
      deployment: {
        nodeEnv: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
