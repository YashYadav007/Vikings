import OpenAI from "openai";
import { EmbeddingProvider } from "./embedding-provider.interface";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai" as const;
  readonly model: string;
  readonly dimensions: number;
  private readonly client: OpenAI | null;

  constructor(
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536),
  ) {
    this.model = model;
    this.dimensions = dimensions;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error("OpenAI embeddings are not configured. Set OPENAI_API_KEY.");
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    return response.data[0]?.embedding ?? [];
  }
}
