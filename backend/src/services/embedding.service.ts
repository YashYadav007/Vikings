import OpenAI from "openai";
import { RagChunk } from "../types";

const MAX_EMBED_INPUT_CHARS = 8000;

export class EmbeddingService {
  readonly provider = process.env.EMBEDDING_PROVIDER ?? "openai";
  readonly model = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
  private readonly client: OpenAI | null;

  constructor() {
    this.client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  isEmbeddingConfigured(): boolean {
    return this.provider === "openai" && Boolean(this.client);
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error("OpenAI embeddings are not configured. Set OPENAI_API_KEY.");
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text.slice(0, MAX_EMBED_INPUT_CHARS),
    });

    return response.data[0]?.embedding ?? [];
  }

  embedChunk(chunk: RagChunk): Promise<number[]> {
    return this.embedText(
      [
        `File: ${chunk.filePath}`,
        `Module: ${chunk.module}`,
        `Language: ${chunk.language ?? "unknown"}`,
        `Summary: ${chunk.summary}`,
        `Symbols: ${(chunk.symbols ?? []).join(", ")}`,
        "Content:",
        chunk.content,
      ].join("\n"),
    );
  }

  embedQuery(query: string): Promise<number[]> {
    return this.embedText(query);
  }
}
