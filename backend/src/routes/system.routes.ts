import { Router } from "express";
import { GitHubWriteService } from "../services/github-write.service";
import { LlmService } from "../services/llm.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";
import { CodingAgentProvider } from "../services/coding-agent/coding-agent-provider.interface";
import { getCodingAgentStatus } from "../services/coding-agent/coding-agent-provider.factory";

export function createSystemRouter(
  memoryService: LocalMemoryService,
  ragService: LocalRagService,
  llmService: LlmService,
  githubWriteService: GitHubWriteService,
  codingAgentProvider?: CodingAgentProvider,
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
        embeddingProvider: ragStatus.embeddingProvider,
        fallbackMode: ragStatus.fallbackMode,
        embeddingModel: ragStatus.embeddingModel,
        embeddingDimensions: ragStatus.embeddingDimensions,
      },
      embeddings: {
        provider: ragStatus.embeddingProvider,
        model: ragStatus.embeddingModel,
        dimensions: ragStatus.embeddingDimensions,
        configured: ragStatus.embeddingConfigured,
      },
      llm: {
        mockMode: llmService.isMockMode(),
        openaiConfigured: llmService.isOpenAIConfigured(),
      },
      github: {
        tokenConfigured: githubWriteService.hasToken(),
        mockWrite: githubWriteService.isMockWrite(),
      },
      agent: codingAgentProvider
        ? getCodingAgentStatus(codingAgentProvider)
        : {
            provider: "mock",
            configuredProvider: process.env.CODING_AGENT_PROVIDER ?? "mock",
            model: "mock",
            configured: true,
            claudeCodeEnabled: process.env.CLAUDE_CODE_ENABLED === "true",
          },
      cache: {
        disableAutoReindex: process.env.DISABLE_AUTO_REINDEX !== "false",
        maxEmbeddingFilesPerImport: Number(process.env.MAX_EMBEDDING_FILES_PER_IMPORT ?? 40),
        maxEmbeddingChunksPerImport: Number(process.env.MAX_EMBEDDING_CHUNKS_PER_IMPORT ?? 200),
        maxAgentContextChunks: Number(process.env.MAX_AGENT_CONTEXT_CHUNKS ?? 8),
      },
      deployment: {
        nodeEnv: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
