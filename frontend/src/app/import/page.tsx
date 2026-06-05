"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { importRepo } from "@/lib/api";
import type { ImportResponse } from "@/lib/types";
import { Card, ErrorState, IconBadge, PageShell } from "@/components/ui";

export default function ImportPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await importRepo(repoUrl.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold text-white">Import GitHub Repo</h1>
        <p className="mt-2 text-slate-400">Create or refresh a Project Brain from a public GitHub repository.</p>

        <Card className="mt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">GitHub repo URL</span>
              <input
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                placeholder="https://github.com/owner/repo"
                className="mt-2 w-full rounded-md border border-workspace-border bg-slate-950 px-4 py-3 text-white outline-none ring-sky-400/40 transition placeholder:text-slate-600 focus:ring-2"
                required
              />
            </label>
            <button
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="mr-2 animate-spin" size={17} /> : <RotateCcw className="mr-2" size={17} />}
              {loading ? "Importing repository..." : "Import Repo"}
            </button>
          </form>
        </Card>

        {loading ? (
          <Card className="mt-5">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="animate-spin text-sky-300" size={20} />
              <span>Scanning files, indexing chunks, and retaining architecture memory...</span>
            </div>
          </Card>
        ) : null}

        {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}

        {result ? (
          <Card className="mt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <IconBadge icon={CheckCircle2} tone="green">Import complete</IconBadge>
                <h2 className="mt-3 text-2xl font-semibold text-white">{result.project.name}</h2>
                <p className="mt-1 break-all text-sm text-slate-400">{result.project.repoUrl}</p>
              </div>
              <Link href={`/projects/${result.project.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300">
                Open Project Brain
                <ArrowRight className="ml-2" size={17} />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryMetric label="Files scanned" value={result.importSummary.filesScanned} />
              <SummaryMetric label="Files indexed" value={result.importSummary.filesIndexed} />
              <SummaryMetric label="Chunks created" value={result.importSummary.chunksCreated} />
              <SummaryMetric label="Memory retained" value={String(result.importSummary.memoryRetained)} />
              <SummaryMetric label="Project reused" value={String(result.importSummary.projectReused)} />
              <SummaryMetric label="Memory count" value={result.project.memoryCount ?? 0} />
            </div>

            {result.importSummary.warnings.length ? (
              <div className="mt-5 rounded-md border border-amber-400/30 bg-amber-950/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <TriangleAlert size={16} />
                  Warnings
                </div>
                <ul className="space-y-1 text-sm text-amber-100/80">
                  {result.importSummary.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-workspace-border bg-slate-950/40 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
