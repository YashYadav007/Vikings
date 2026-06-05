import { EmbeddingService } from "../embedding.service";
import { SupabaseService } from "../supabase.service";
import { RagChunk, ScoredRagChunk } from "../../types";
import { IndexChunksResult, RagProvider } from "./rag-provider.interface";

interface MatchCodeChunkRow {
  id: string;
  project_id: string;
  file_path: string;
  language: string | null;
  module: string | null;
  summary: string | null;
  content: string;
  start_line: number | null;
  end_line: number | null;
  symbols: unknown;
  source: string | null;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export class PgvectorRagProvider implements RagProvider {
  readonly name = "pgvector" as const;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async indexChunks(projectId: string, chunks: RagChunk[]): Promise<IndexChunksResult> {
    const warnings: string[] = [];
    await this.clearProjectChunks(projectId);

    const rows = [];
    for (const chunk of chunks) {
      const embedding = await this.embeddingService.embedChunk(chunk);
      rows.push({
        project_id: projectId,
        file_path: chunk.filePath,
        language: chunk.language,
        module: chunk.module,
        summary: chunk.summary,
        content: chunk.content,
        start_line: chunk.startLine,
        end_line: chunk.endLine,
        symbols: chunk.symbols ?? [],
        source: chunk.source ?? "github",
        metadata: { originalId: chunk.id },
        embedding,
      });
    }

    if (rows.length > 0) {
      const { error } = await this.supabaseService.getClient().from("code_chunks").insert(rows);
      if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    }

    return {
      provider: "pgvector",
      semanticIndex: true,
      chunksIndexed: rows.length,
      warnings,
    };
  }

  async search(projectId: string, query: string, options?: { topK?: number; includeContent?: boolean }): Promise<ScoredRagChunk[]> {
    const embedding = await this.embeddingService.embedQuery(query);
    const { data, error } = await this.supabaseService.getClient().rpc("match_code_chunks", {
      query_embedding: embedding,
      match_project_id: projectId,
      match_count: options?.topK ?? 8,
    });

    if (error) throw new Error(`Supabase match_code_chunks failed: ${error.message}`);

    return ((data ?? []) as MatchCodeChunkRow[]).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      filePath: row.file_path,
      language: row.language ?? undefined,
      module: row.module ?? "Root",
      summary: row.summary ?? "",
      content: options?.includeContent === false ? "" : row.content,
      startLine: row.start_line ?? undefined,
      endLine: row.end_line ?? undefined,
      symbols: Array.isArray(row.symbols) ? row.symbols.filter((symbol): symbol is string => typeof symbol === "string") : [],
      source: row.source === "seed" ? "seed" : "github",
      score: row.similarity,
    }));
  }

  async listChunks(projectId: string): Promise<RagChunk[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("code_chunks")
      .select("id, project_id, file_path, language, module, summary, content, start_line, end_line, symbols, source, metadata")
      .eq("project_id", projectId)
      .order("file_path", { ascending: true });

    if (error) throw new Error(`Supabase list chunks failed: ${error.message}`);

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      filePath: String(row.file_path),
      language: typeof row.language === "string" ? row.language : undefined,
      module: typeof row.module === "string" ? row.module : "Root",
      summary: typeof row.summary === "string" ? row.summary : "",
      content: String(row.content ?? ""),
      startLine: typeof row.start_line === "number" ? row.start_line : undefined,
      endLine: typeof row.end_line === "number" ? row.end_line : undefined,
      symbols: Array.isArray(row.symbols) ? row.symbols.filter((symbol): symbol is string => typeof symbol === "string") : [],
      source: row.source === "seed" ? "seed" : "github",
    }));
  }

  async clearProjectChunks(projectId: string): Promise<void> {
    const { error } = await this.supabaseService.getClient().from("code_chunks").delete().eq("project_id", projectId);
    if (error) throw new Error(`Supabase clear chunks failed: ${error.message}`);
  }
}
