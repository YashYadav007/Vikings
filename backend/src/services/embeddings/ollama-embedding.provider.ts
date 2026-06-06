import { EmbeddingProvider } from "./embedding-provider.interface";

interface OllamaEmbeddingResponse {
  embedding?: number[];
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "ollama" as const;
  readonly model: string;
  readonly dimensions: number;
  private readonly baseUrl: string;

  constructor(
    model = process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
    dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536),
    baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ) {
    this.model = model;
    this.dimensions = dimensions;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.model);
  }

  async embedText(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });
    const body = (await response.json()) as OllamaEmbeddingResponse & { error?: string };
    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${body.error ?? response.statusText}`);
    }
    return body.embedding ?? [];
  }
}
