export type EmbeddingProviderName = "openai" | "gemini" | "ollama";

export interface EmbeddingProvider {
  readonly name: EmbeddingProviderName;
  readonly model: string;
  readonly dimensions: number;

  isConfigured(): boolean;
  embedText(text: string): Promise<number[]>;
}

export interface EmbeddingProviderStatus {
  provider: EmbeddingProviderName;
  model: string;
  dimensions: number;
  configured: boolean;
}
