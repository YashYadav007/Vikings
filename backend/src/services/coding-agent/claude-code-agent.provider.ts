import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { CodingAgentProvider, CodingAgentTaskInput, CodingAgentTaskResult } from "./coding-agent-provider.interface";
import { LlmCodingAgentProvider } from "./llm-coding-agent.provider";

export class ClaudeCodeAgentProvider implements CodingAgentProvider {
  readonly name = "claude-code" as const;

  constructor(private readonly fallbackProvider: CodingAgentProvider = new LlmCodingAgentProvider()) {}

  async runTask(input: CodingAgentTaskInput): Promise<CodingAgentTaskResult> {
    if (process.env.CLAUDE_CODE_ENABLED !== "true") {
      return this.fallbackProvider.runTask(input);
    }

    const command = process.env.CLAUDE_CODE_COMMAND ?? "claude";
    const workspace = mkdtempSync(join(tmpdir(), "devcontext-claude-"));
    const contextPath = join(workspace, "DEVCONTEXT_TASK.json");
    writeFileSync(
      contextPath,
      JSON.stringify(
        {
          task: input.message,
          hindsightMemories: input.hindsightMemories,
          ragContext: input.ragContext,
          safetyRules: ["Do not push to main/master", "Return structured JSON only", "Do not store secrets"],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = spawnSync(command, ["--print", `Read ${contextPath} and produce the DevContext coding-agent JSON result.`], {
      cwd: workspace,
      encoding: "utf8",
      timeout: 120000,
    });

    if (result.error || result.status !== 0) {
      console.warn(`Claude Code adapter failed; falling back to LLM provider. ${result.error?.message ?? result.stderr}`);
      return this.fallbackProvider.runTask(input);
    }

    // Hosted demo does not depend on Claude Code. Normalize through the LLM provider until
    // the CLI adapter has a stable machine-readable contract.
    return this.fallbackProvider.runTask(input);
  }
}
