import { Router } from "express";
import { GitHubWriteService } from "../services/github-write.service";
import { LlmService } from "../services/llm.service";
import { LocalMemoryService } from "../services/local-memory.service";
import { LocalRagService } from "../services/local-rag.service";
import { CodingAgentProvider } from "../services/coding-agent/coding-agent-provider.interface";

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
      agent: {
        provider: codingAgentProvider?.name ?? "mock",
        configuredProvider: process.env.CODING_AGENT_PROVIDER ?? "mock",
        model: process.env.CODING_AGENT_MODEL ?? "gpt-4.1-mini",
        claudeCodeEnabled: process.env.CLAUDE_CODE_ENABLED === "true",
      },
      deployment: {
        nodeEnv: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
