"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrainTabs } from "@/components/brain-tabs";
import { Card, EmptyState, ErrorState, IconBadge, LoadingState, PageShell } from "@/components/ui";
import { getMemoryDebug, getMemoryQualityReport, getProjectMemories } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Memory } from "@/lib/types";

export default function MemoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [usefulMemories, setUsefulMemories] = useState<Memory[]>([]);
  const [qualityCounts, setQualityCounts] = useState<{ noisy: number; duplicates: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProjectMemories(projectId), getMemoryDebug(projectId).catch(() => null), getMemoryQualityReport(projectId).catch(() => null)])
      .then(([projectMemories, debug, quality]) => {
        const debugMemories = debug?.memories ?? [];
        setProvider(debug?.provider ?? null);
        const full = debugMemories.length >= projectMemories.length ? debugMemories : projectMemories;
        setAllMemories(full);
        const useful = quality?.recommendedKeep ?? full;
        setUsefulMemories(useful);
        setMemories(useful);
        setQualityCounts(
          quality
            ? {
                noisy: quality.noisyMemories.length,
                duplicates: quality.duplicateGroups.reduce((total, group) => total + group.count - 1, 0),
              }
            : null,
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Memory Timeline</h1>
          <p className="mt-2 text-slate-400">Project journey memory from retained decisions, risks, bugs, and tasks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {provider ? <IconBadge tone="purple">Provider: {provider}</IconBadge> : null}
          {qualityCounts ? <IconBadge tone="green">Useful default</IconBadge> : null}
          {qualityCounts ? <IconBadge tone="orange">Noisy {qualityCounts.noisy}</IconBadge> : null}
          {qualityCounts ? <IconBadge tone="orange">Duplicates {qualityCounts.duplicates}</IconBadge> : null}
          <button
            onClick={() => {
              setShowAll((current) => {
                const next = !current;
                setMemories(next ? allMemories : usefulMemories);
                return next;
              });
            }}
            className="rounded-md border border-workspace-border bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-white/10"
          >
            {showAll ? "Useful memories" : "All/debug memories"}
          </button>
        </div>
      </div>

      {loading ? <div className="mt-5"><LoadingState label="Loading memories..." /></div> : null}
      {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
      {!loading && !error && memories.length === 0 ? <div className="mt-5"><EmptyState title="No memories retained" body="Run a compare task and save suggested memory to populate the timeline." /></div> : null}

      <div className="mt-5 space-y-4">
        {memories.map((memory) => (
          <Card key={memory.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <IconBadge tone={memory.type === "risk" ? "orange" : memory.type === "bug" ? "red" : "green"}>{memory.type}</IconBadge>
                <h2 className="mt-3 text-xl font-semibold text-white">{memory.title}</h2>
              </div>
              <span className="text-sm text-slate-500">{formatDate(memory.createdAt)}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{memory.content}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {memory.relatedFiles.map((file) => (
                <span key={file} className="rounded-md border border-workspace-border bg-slate-950/50 px-2 py-1 font-mono text-xs text-slate-300">
                  {file}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
