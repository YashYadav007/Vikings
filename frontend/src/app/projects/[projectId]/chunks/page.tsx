"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrainTabs } from "@/components/brain-tabs";
import { Card, EmptyState, ErrorState, IconBadge, LoadingState, PageShell } from "@/components/ui";
import { getRagChunks } from "@/lib/api";
import { truncate } from "@/lib/format";
import type { RagChunk } from "@/lib/types";

export default function ChunksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [chunks, setChunks] = useState<RagChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRagChunks(projectId)
      .then(setChunks)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />
      <div className="mt-6">
        <h1 className="text-3xl font-semibold text-white">RAG Chunks</h1>
        <p className="mt-2 text-slate-400">Indexed codebase knowledge available to Agent Vikings.</p>
      </div>

      {loading ? <div className="mt-5"><LoadingState label="Loading chunks..." /></div> : null}
      {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
      {!loading && !error && chunks.length === 0 ? <div className="mt-5"><EmptyState title="No chunks indexed" body="Import or refresh a repository to index RAG chunks." /></div> : null}

      <div className="mt-5 grid gap-4">
        {chunks.map((chunk) => (
          <Card key={chunk.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="break-all font-mono text-lg font-semibold text-sky-200">{chunk.filePath}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <IconBadge>{chunk.module}</IconBadge>
                  {chunk.source ? <IconBadge tone={chunk.source === "github" ? "blue" : "purple"}>{chunk.source}</IconBadge> : null}
                  {chunk.startLine || chunk.endLine ? <IconBadge>Lines {chunk.startLine ?? "?"}-{chunk.endLine ?? "?"}</IconBadge> : null}
                </div>
              </div>
              {chunk.score !== undefined ? <IconBadge tone="green">Score {chunk.score.toFixed(2)}</IconBadge> : null}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{chunk.summary}</p>
            <pre className="mt-4 overflow-auto rounded-md border border-workspace-border bg-slate-950/70 p-4 text-xs leading-5 text-slate-300">{truncate(chunk.content, 900)}</pre>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
