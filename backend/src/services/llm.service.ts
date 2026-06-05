import OpenAI from "openai";
import { MemoryPoweredAnswer, ScoredMemory, ScoredRagChunk } from "../types";

const AGENT_SYSTEM_PROMPT = `You are DevContext OS, a project-aware AI coding agent.

You work inside one specific GitHub repository.

Use two sources:
1. RAG code context: relevant files, functions, APIs, schemas and docs.
2. Project memory: previous bugs, decisions, coding conventions, risks, task outcomes and developer preferences.

Rules:
- Do not give generic coding advice if project context is available.
- Mention the files/modules likely affected.
- Mention the memories that influenced your answer.
- Produce a safe implementation plan before patching.
- If generating code, show a patch preview and tests to run.
- After task completion, propose what should be retained into memory.
- Never store secrets or raw private credentials in memory.

Goal:
Make the developer feel they never need to re-explain this repo again.`;

export class LlmService {
  private readonly useMock: boolean;
  private readonly client: OpenAI | null;

  constructor() {
    this.useMock = process.env.USE_MOCK_LLM !== "false";
    this.client = !this.useMock && process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  async generateGenericAnswer(message: string): Promise<string> {
    if (!this.client) {
      return [
        `Generic coding answer for: "${message}".`,
        "Identify the pricing function, add coupon validation, subtract the discount from the cart subtotal, and add unit tests for valid, invalid, and empty coupon cases.",
      ].join(" ");
    }

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise general-purpose coding assistant." },
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    return response.choices[0]?.message.content ?? "No answer generated.";
  }

  async generateMemoryAnswer(
    message: string,
    chunks: ScoredRagChunk[],
    memories: ScoredMemory[],
  ): Promise<MemoryPoweredAnswer> {
    if (!this.client) {
      return this.generateMockMemoryAnswer(message, chunks, memories);
    }

    const prompt = {
      task: message,
      chunks,
      memories,
      requiredJsonShape: {
        taskType: "feature",
        answer: "string",
        filesUsed: [{ path: "string", reason: "string" }],
        memoriesUsed: [{ type: "bug", title: "string", content: "string" }],
        patchPreview: [{ filePath: "string", changeSummary: "string", diff: "string" }],
        testsToRun: ["string"],
        risks: ["string"],
        memoryToSave: [{ type: "decision", title: "string", content: "string", relatedFiles: ["string"] }],
      },
    };

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${AGENT_SYSTEM_PROMPT}\nReturn only valid JSON.` },
        { role: "user", content: JSON.stringify(prompt, null, 2) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Omit<
      MemoryPoweredAnswer,
      "chunksUsed" | "rawMemoriesUsed"
    >;

    return {
      ...parsed,
      chunksUsed: chunks,
      rawMemoriesUsed: memories,
    };
  }

  private generateMockMemoryAnswer(
    message: string,
    chunks: ScoredRagChunk[],
    memories: ScoredMemory[],
  ): MemoryPoweredAnswer {
    const hasShopEaseCart = chunks.some((chunk) => chunk.filePath === "src/lib/cartService.ts");
    if (!hasShopEaseCart) {
      return this.generateGenericProjectMockAnswer(message, chunks, memories);
    }

    const cartChunk = chunks.find((chunk) => chunk.filePath === "src/lib/cartService.ts") ?? chunks[0];
    const checkoutChunk = chunks.find((chunk) => chunk.filePath === "src/app/api/checkout/route.ts");
    const validationMemory = memories.find((memory) => memory.title === "Validation style");
    const riskMemory = memories.find((memory) => memory.type === "risk");

    return {
      taskType: "feature",
      answer: [
        `For "${message}", implement coupon support in the Cart and Checkout paths instead of adding a standalone helper.`,
        "The remembered quantity bug and coupon-order decision mean the safe order is: normalize quantities, calculate subtotal, apply coupon, then let checkout build its response.",
        "Validate coupon input with Zod at the API boundary and keep the calculation deterministic in cartService.",
      ].join(" "),
      filesUsed: [
        {
          path: cartChunk?.filePath ?? "src/lib/cartService.ts",
          reason: "Cart pricing logic and quantity normalization live here.",
        },
        {
          path: checkoutChunk?.filePath ?? "src/app/api/checkout/route.ts",
          reason: "Checkout consumes the final total and should pass validated coupon data into cart pricing.",
        },
        {
          path: "src/lib/validation.ts",
          reason: validationMemory
            ? "Project memory says API inputs should use Zod validation."
            : "Coupon code belongs in the shared checkout schema.",
        },
      ],
      memoriesUsed: memories.map((memory) => ({
        type: memory.type,
        title: memory.title,
        content: memory.content,
      })),
      patchPreview: [
        {
          filePath: "src/lib/cartService.ts",
          changeSummary: "Add coupon calculation after quantity normalization and subtotal calculation.",
          diff: `- export function calculateCartTotal(items: CartItem[]): number {
+ export function calculateCartTotal(items: CartItem[], couponCode?: string): number {
    const subtotal = items.reduce((total, item) => {
      const quantity = normalizeQuantity(item.quantity);
      return total + item.price * quantity;
    }, 0);
+   return applyCouponDiscount(subtotal, couponCode);
  }`,
        },
        {
          filePath: "src/app/api/checkout/route.ts",
          changeSummary: "Pass the validated coupon code into cart total calculation.",
          diff: `- const total = calculateCartTotal(parsed.data.items);
+ const total = calculateCartTotal(parsed.data.items, parsed.data.couponCode);`,
        },
        {
          filePath: "src/lib/validation.ts",
          changeSummary: "Keep couponCode optional and validated through the shared checkout schema.",
          diff: `  export const checkoutSchema = z.object({
    items: z.array(cartItemSchema).min(1),
    couponCode: z.string().optional(),
  });`,
        },
      ],
      testsToRun: ["cart total test", "coupon discount test", "checkout payload validation test"],
      risks: [
        riskMemory?.content ??
          "Checkout total calculation is sensitive to operation order: quantity normalization, coupon discount, tax, then final total.",
      ],
      memoryToSave: [
        {
          type: "decision",
          title: "Coupon calculation order",
          content: "Apply coupon after quantity normalization but before checkout summary generation.",
          relatedFiles: ["src/lib/cartService.ts", "src/app/api/checkout/route.ts"],
        },
      ],
      chunksUsed: chunks,
      rawMemoriesUsed: memories,
    };
  }

  private generateGenericProjectMockAnswer(
    message: string,
    chunks: ScoredRagChunk[],
    memories: ScoredMemory[],
  ): MemoryPoweredAnswer {
    const primaryChunks = chunks.slice(0, 3);
    const files = primaryChunks.map((chunk) => chunk.filePath);
    const architectureMemory = memories.find((memory) => memory.type === "architecture");

    return {
      taskType: "analysis",
      answer: [
        `For "${message}", use the imported repository context instead of generic assumptions.`,
        primaryChunks.length > 0
          ? `The most relevant indexed files are ${files.join(", ")}.`
          : "No indexed chunks matched strongly, so start from the project summary and README if available.",
        architectureMemory
          ? `The architecture memory says: ${architectureMemory.content}`
          : "No durable architecture memory was recalled yet.",
      ].join(" "),
      filesUsed: primaryChunks.map((chunk) => ({
        path: chunk.filePath,
        reason: `${chunk.summary} Matched local RAG keyword search with score ${chunk.score}.`,
      })),
      memoriesUsed: memories.map((memory) => ({
        type: memory.type,
        title: memory.title,
        content: memory.content,
      })),
      patchPreview: primaryChunks.slice(0, 2).map((chunk) => ({
        filePath: chunk.filePath,
        changeSummary: "Review this file before proposing edits; it is part of the imported project context.",
        diff: "pseudo diff pending concrete implementation request",
      })),
      testsToRun: ["project build/test command from package manifest if present", "targeted tests around touched files"],
      risks: memories.filter((memory) => memory.type === "risk").map((memory) => memory.content),
      memoryToSave: [
        {
          type: "task",
          title: "Imported project task outcome",
          content: `Record the durable outcome after completing: ${message}`,
          relatedFiles: files,
        },
      ],
      chunksUsed: chunks,
      rawMemoriesUsed: memories,
    };
  }
}
