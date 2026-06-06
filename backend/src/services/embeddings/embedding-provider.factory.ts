import { GeminiEmbeddingProvider } from "./gemini-embedding.provider";
import { EmbeddingProvider, EmbeddingProviderName, EmbeddingProviderStatus } from "./embedding-provider.interface";
import { OllamaEmbeddingProvider } from "./ollama-embedding.provider";
import { OpenAIEmbeddingProvider } from "./openai-embedding.provider";

export function createEmbeddingProvider(): EmbeddingProvider {
  const requested = (process.env.EMBEDDING_PROVIDER ?? "openai") as EmbeddingProviderName;

  if (requested === "gemini") return new GeminiEmbeddingProvider();
  if (requested === "ollama") return new OllamaEmbeddingProvider();
  return new OpenAIEmbeddingProvider();
}

export function getEmbeddingProviderStatus(provider: EmbeddingProvider): EmbeddingProviderStatus {
  return {
    provider: provider.name,
    model: provider.model,
    dimensions: provider.dimensions,
    configured: provider.isConfigured(),
  };
}
