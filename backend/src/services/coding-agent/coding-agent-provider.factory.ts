import { CodingAgentProvider } from "./coding-agent-provider.interface";
import { ClaudeCodeAgentProvider } from "./claude-code-agent.provider";
import { LlmCodingAgentProvider } from "./llm-coding-agent.provider";
import { MockCodingAgentProvider } from "./mock-coding-agent.provider";

export function createCodingAgentProvider(): CodingAgentProvider {
  const requested = process.env.CODING_AGENT_PROVIDER ?? (process.env.OPENAI_API_KEY && process.env.USE_MOCK_LLM === "false" ? "llm" : "mock");

  if (requested === "llm") {
    try {
      return new LlmCodingAgentProvider();
    } catch (error) {
      console.warn(`CODING_AGENT_PROVIDER=llm unavailable; using mock provider. ${error instanceof Error ? error.message : String(error)}`);
      return new MockCodingAgentProvider();
    }
  }

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
