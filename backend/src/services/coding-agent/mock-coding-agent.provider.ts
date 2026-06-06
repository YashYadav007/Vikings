import { CodingAgentProvider, CodingAgentTaskInput, CodingAgentTaskResult } from "./coding-agent-provider.interface";

export class MockCodingAgentProvider implements CodingAgentProvider {
  readonly name = "mock" as const;

  async runTask(input: CodingAgentTaskInput): Promise<CodingAgentTaskResult> {
    const target = this.pickTarget(input);
    const memoryInfluence =
      input.hindsightMemories.length > 0
        ? `Memory influence: ${input.hindsightMemories
            .slice(0, 3)
            .map((memory) => `${memory.title} means ${memory.content}`)
            .join(" ")}`
        : "Memory influence: No prior project memory matched this task yet.";
    const isReadme = /readme|setup|docs|documentation/i.test(input.message);
    const filePath = isReadme ? "README.md" : target.filePath;
    const original = isReadme && target.filePath !== "README.md" ? "# Project\n" : target.content || "# Project\n";
    const newContent = isReadme ? this.readmeContent(original, input.message) : `${original.trimEnd()}\n// DevContext planned change: ${input.message}\n`;

    return {
      plan: [
        `Task: ${input.message}`,
        memoryInfluence,
        `1. Use RAG evidence from ${input.ragContext.slice(0, 3).map((chunk) => chunk.filePath).join(", ") || "project summary"}.`,
        `2. Edit ${filePath} with a focused patch.`,
        "3. Apply safely, update changed-file RAG chunks, and retain task learning.",
      ].join("\n"),
      memoryInfluence,
      filesToEdit: [filePath],
      patchPreview: [
        {
          filePath,
          status: isReadme && target.filePath !== "README.md" ? "added" : "modified",
          changeSummary: `Apply task-specific update for: ${input.message}`,
          originalContentSnippet: original.slice(0, 1200),
          diff: [`--- ${filePath}`, `+++ ${filePath}`, "@@ DevContext mock agent @@", `+${input.message}`].join("\n"),
          newContent,
          risk: "Mock provider generated a deterministic patch for local development.",
        },
      ],
      testsToRun: ["project build/test command if configured", "review changed file manually"],
      risks: ["Generated patch should be reviewed before real GitHub write."],
      suggestedMemories: [
        {
          type: "task",
          title: input.message.length > 80 ? `${input.message.slice(0, 77)}...` : input.message,
          content: `Completed task should be remembered with changed files, risks, tests, and RAG update summary. Task: ${input.message}`,
          relatedFiles: [filePath],
          tags: ["task", "coding-agent"],
        },
      ],
      confidence: 0.72,
      requiresApproval: true,
    };
  }

  private pickTarget(input: CodingAgentTaskInput) {
    return (
      input.ragContext.find((chunk) => /readme/i.test(chunk.filePath)) ??
      input.ragContext[0] ?? {
        filePath: "README.md",
        content: "# Project\n",
      }
    );
  }

  private readmeContent(content: string, message: string): string {
    const base = content.trim().length > 0 ? content.trimEnd() : "# Project";
    if (/^##\s+Setup/im.test(base)) {
      return `${base}\n\n## Troubleshooting\n\n- If setup fails, verify dependencies, environment variables, and extension permissions.\n\n<!-- DevContext task: ${message} -->\n`;
    }
    return `${base}\n\n## Setup\n\n- Install dependencies with the package manager used by this repository.\n- Run the documented development command before editing.\n- For Manifest V3 Chrome extensions, enable Developer Mode and load the unpacked extension from chrome://extensions.\n\n<!-- DevContext task: ${message} -->\n`;
  }
}
