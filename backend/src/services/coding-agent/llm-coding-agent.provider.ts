import OpenAI from "openai";
import { z } from "zod";
import { CodingAgentProvider, CodingAgentTaskInput, CodingAgentTaskResult } from "./coding-agent-provider.interface";

const patchSchema = z.object({
  filePath: z.string().min(1),
  status: z.enum(["added", "modified", "deleted"]),
  changeSummary: z.string().min(1),
  originalContentSnippet: z.string().default(""),
  diff: z.string().min(1),
  newContent: z.string().default(""),
  risk: z.string().min(1),
});

const memorySchema = z.object({
  type: z.enum(["decision", "risk", "preference", "task", "follow-up", "bug", "style", "architecture"]),
  title: z.string().min(1),
  content: z.string().min(1),
  relatedFiles: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
});

const resultSchema = z.object({
  plan: z.string().min(1),
  memoryInfluence: z.string().min(1),
  filesToEdit: z.array(z.string()).default([]),
  patchPreview: z.array(patchSchema).default([]),
  testsToRun: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  suggestedMemories: z.array(memorySchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  requiresApproval: z.boolean().default(true),
});

export class LlmCodingAgentProvider implements CodingAgentProvider {
  readonly name = "llm" as const;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey = process.env.OPENAI_API_KEY, model = process.env.CODING_AGENT_MODEL ?? "gpt-4.1-mini") {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for CODING_AGENT_PROVIDER=llm.");
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async runTask(input: CodingAgentTaskInput): Promise<CodingAgentTaskResult> {
    const prompt = this.buildPrompt(input);
    const raw = await this.complete(prompt);
    const parsed = this.parseAndValidate(raw);
    if (parsed.success) return parsed.data;

    const repaired = await this.complete([
      "Repair this invalid coding-agent JSON. Return only valid JSON matching the required schema.",
      `Validation error: ${parsed.error}`,
      `Invalid output excerpt:\n${raw.slice(0, 4000)}`,
    ].join("\n\n"));
    const repairedParsed = this.parseAndValidate(repaired);
    if (repairedParsed.success) return repairedParsed.data;

    throw new Error(`LLM coding agent returned invalid JSON after repair: ${repairedParsed.error}. Raw excerpt: ${repaired.slice(0, 800)}`);
  }

  private async complete(content: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "You are DevContext OS coding agent. You modify projects using RAG code context and Hindsight project memory. You must preserve project conventions and learn from prior tasks. Return only valid JSON.",
        },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      temperature: 0.15,
    });
    return response.choices[0]?.message.content ?? "{}";
  }

  private buildPrompt(input: CodingAgentTaskInput): string {
    return JSON.stringify(
      {
        role: "DevContext OS coding agent",
        task: input.message,
        mode: input.mode,
        project: {
          id: input.project.id,
          name: input.project.name,
          repoUrl: input.project.repoUrl,
          stack: input.project.stack,
          modules: input.project.modules,
          architecture: input.project.architecture,
          riskAreas: input.project.riskAreas,
        },
        hindsightMemories: input.hindsightMemories.map((memory) => ({
          type: memory.type,
          title: memory.title,
          content: memory.content,
          relatedFiles: memory.relatedFiles,
          score: memory.score,
        })),
        learningSummary: input.learningSummary,
        ragChunks: input.ragContext.map((chunk) => ({
          filePath: chunk.filePath,
          module: chunk.module,
          language: chunk.language,
          summary: chunk.summary,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          symbols: chunk.symbols,
          content: chunk.content.slice(0, 5000),
          score: chunk.score,
        })),
        constraints: [
          "Start from Hindsight memory. If memories exist, explicitly explain how they influence the plan.",
          "Use RAG chunks as source of truth for file paths and code structure.",
          "Prefer minimal focused edits. Avoid unrelated changes.",
          "Never invent file paths if context lacks evidence, except README.md for documentation tasks.",
          `Edit at most ${input.maxFiles ?? 3} files.`,
          "Do not include secrets or raw credentials.",
          "Hindsight suggestedMemories must store durable learning, not raw full code.",
          "Return newContent only when confident. For deleted files, newContent should be empty.",
        ],
        outputJsonSchema: {
          plan: "string",
          memoryInfluence: "string",
          filesToEdit: ["string"],
          patchPreview: [
            {
              filePath: "string",
              status: "added|modified|deleted",
              changeSummary: "string",
              originalContentSnippet: "string",
              diff: "string",
              newContent: "string",
              risk: "string",
            },
          ],
          testsToRun: ["string"],
          risks: ["string"],
          suggestedMemories: [
            {
              type: "decision|risk|preference|task|follow-up",
              title: "string",
              content: "string",
              relatedFiles: ["string"],
            },
          ],
          confidence: 0.0,
          requiresApproval: true,
        },
      },
      null,
      2,
    );
  }

  private parseAndValidate(raw: string): { success: true; data: CodingAgentTaskResult } | { success: false; error: string } {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const result = resultSchema.safeParse(parsed);
      if (!result.success) return { success: false, error: JSON.stringify(result.error.flatten()) };
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
