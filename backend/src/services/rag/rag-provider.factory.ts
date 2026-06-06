import { EmbeddingService } from "../embedding.service";
import { SupabaseService } from "../supabase.service";
import { LocalRagProvider } from "./local-rag.provider";
import { PgvectorRagProvider } from "./pgvector-rag.provider";
import { RagProvider } from "./rag-provider.interface";

export interface RagProviderStatus {
  configuredProvider: string;
  activeProvider: "local" | "pgvector";
  pgvectorConfigured: boolean;
  supabaseConfigured: boolean;
  embeddingConfigured: boolean;
  embeddingProvider: string;
  fallbackMode: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
}

export function createRagProvider(localProvider: LocalRagProvider, supabaseService: SupabaseService, embeddingService: EmbeddingService): RagProvider {
  const requestedProvider = process.env.RAG_PROVIDER ?? "local";
  const fallbackMode = process.env.RAG_FALLBACK_MODE ?? "local";

  if (requestedProvider === "pgvector") {
    const supabaseConfigured = supabaseService.isConfigured();
    const embeddingConfigured = embeddingService.isEmbeddingConfigured();

    if (supabaseConfigured && embeddingConfigured) {
      return new PgvectorRagProvider(supabaseService, embeddingService);
    }

    if (fallbackMode === "local") {
      console.warn("RAG_PROVIDER=pgvector requested, but Supabase or embeddings are not configured. Falling back to local RAG.");
      return localProvider;
    }
  }

  return localProvider;
}

export function getRagProviderStatus(
  activeProvider: RagProvider["name"],
  supabaseService: SupabaseService,
  embeddingService: EmbeddingService,
): RagProviderStatus {
  const configuredProvider = process.env.RAG_PROVIDER ?? "local";
  const supabaseConfigured = supabaseService.isConfigured();
  const embeddingConfigured = embeddingService.isEmbeddingConfigured();

  return {
    configuredProvider,
    activeProvider,
    pgvectorConfigured: configuredProvider === "pgvector" && supabaseConfigured && embeddingConfigured,
    supabaseConfigured,
    embeddingConfigured,
    embeddingProvider: embeddingService.provider,
    fallbackMode: process.env.RAG_FALLBACK_MODE ?? "local",
    embeddingModel: embeddingService.model,
    embeddingDimensions: embeddingService.dimensions,
  };
}
