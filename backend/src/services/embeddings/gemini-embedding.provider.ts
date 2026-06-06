import { EmbeddingProvider } from "./embedding-provider.interface";

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  readonly dimensions: number;
  private readonly apiKey?: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.EMBEDDING_MODEL ?? "gemini-embedding-2",
    dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536),
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.dimensions = dimensions;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error("Gemini embeddings are not configured. Set GEMINI_API_KEY.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:embedContent?key=${encodeURIComponent(
        this.apiKey,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: {
            parts: [{ text }],
          },
          outputDimensionality: this.dimensions,
        }),
      },
    );

    const body = (await response.json()) as GeminiEmbeddingResponse & { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(`Gemini embedding failed: ${body.error?.message ?? response.statusText}`);
    }

    return body.embedding?.values ?? [];
  }
}
