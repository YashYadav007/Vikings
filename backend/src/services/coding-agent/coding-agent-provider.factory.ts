import { CodingAgentProvider } from "./coding-agent-provider.interface";
import { ClaudeCodeAgentProvider } from "./claude-code-agent.provider";
import { GeminiCodingAgentProvider } from "./gemini-coding-agent.provider";
import { LlmCodingAgentProvider } from "./llm-coding-agent.provider";
import { MockCodingAgentProvider } from "./mock-coding-agent.provider";

export function createCodingAgentProvider(): CodingAgentProvider {
  const requested =
    process.env.CODING_AGENT_PROVIDER ?? (process.env.GEMINI_API_KEY && process.env.USE_MOCK_LLM === "false" ? "gemini" : "mock");

  if (requested === "gemini") return new GeminiCodingAgentProvider();
  if (requested === "openai") return new LlmCodingAgentProvider(process.env.OPENAI_API_KEY, process.env.CODING_AGENT_MODEL, "openai");
  if (requested === "llm") return new LlmCodingAgentProvider(process.env.OPENAI_API_KEY, process.env.CODING_AGENT_MODEL, "llm");

  if (requested === "claude-code") {
    try {
      return new ClaudeCodeAgentProvider();
    } catch (error) {
      console.warn(`CODING_AGENT_PROVIDER=claude-code unavailable; using mock provider. ${error instanceof Error ? error.message : String(error)}`);
      return new MockCodingAgentProvider();
    }
  }

  return new MockCodingAgentProvider();
}

export function getCodingAgentStatus(provider: CodingAgentProvider) {
  const configuredProvider =
    process.env.CODING_AGENT_PROVIDER ?? (process.env.GEMINI_API_KEY && process.env.USE_MOCK_LLM === "false" ? "gemini" : "mock");
  const model =
    process.env.CODING_AGENT_MODEL ??
    (configuredProvider === "gemini" ? "gemini-2.5-flash-lite" : configuredProvider === "mock" ? "mock" : "gpt-4.1-mini");
  const configured =
    provider.name === "gemini"
      ? Boolean(process.env.GEMINI_API_KEY)
      : provider.name === "openai" || provider.name === "llm"
        ? Boolean(process.env.OPENAI_API_KEY)
        : provider.name === "claude-code"
          ? process.env.CLAUDE_CODE_ENABLED === "true"
          : provider.name === "mock";

  return {
    provider: provider.name,
    configuredProvider,
    model,
    configured,
    claudeCodeEnabled: process.env.CLAUDE_CODE_ENABLED === "true",
  };
}
