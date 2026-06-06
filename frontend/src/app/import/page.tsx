"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileSearch,
  FileStack,
  Github,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { importRepo } from "@/lib/api";
import type { ImportResponse } from "@/lib/types";
import { Button, Card, CornerFrame, ErrorState, FramedTitle, HudLabel, IconBadge, PageShell } from "@/components/ui";

const PIPELINE = [
  { icon: FileSearch, label: "Scan files" },
  { icon: FileStack, label: "Index chunks" },
  { icon: Database, label: "Retain memory" },
];

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
        {/* Hero */}
        <FramedTitle pretitle="Ingest / GitHub">
          Import
          <br />
          GitHub Repo
        </FramedTitle>
        <p className="mt-5 pl-[1.4rem] text-sm leading-relaxed text-cream/55 sm:text-base">
          Create or refresh a Vikings Brain from a public GitHub repository. We scan the tree, index code into
          retrievable chunks, and retain architecture memory.
        </p>

        <div className="hairline mt-10" />

        {/* Pipeline strip */}
        <div className="mt-7 flex flex-wrap items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em]">
          {PIPELINE.map((step, i) => (
            <span key={step.label} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-cream/70">
                <step.icon size={13} className="text-brand-teal" />
                {step.label}
              </span>
              {i < PIPELINE.length - 1 ? <ArrowRight size={12} className="text-cream/25" /> : null}
            </span>
          ))}
        </div>

        {/* Form */}
        <Card className="mt-6" framed>
          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block">
              <HudLabel>GitHub Repo URL</HudLabel>
              <div className="mt-2 flex items-center gap-3 border border-line bg-ink-900 px-3 transition focus-within:border-brand-purple/60">
                <Github size={18} className="shrink-0 text-cream/40" />
                <input
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full bg-transparent py-3 font-mono text-sm text-cream outline-none placeholder:text-cream/30"
                  required
                />
              </div>
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
              {loading ? "Importing repository..." : "Import Repo"}
            </Button>
          </form>
        </Card>

        {/* Loading */}
        {loading ? (
          <Card className="mt-5">
            <div className="flex items-center gap-3 text-cream/70">
              <Loader2 className="animate-spin text-brand-teal" size={20} />
              <span className="text-sm">Scanning files, indexing chunks, and retaining architecture memory...</span>
            </div>
          </Card>
        ) : null}

        {/* Error */}
        {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}

        {/* Result */}
        {result ? (
          <Card className="relative mt-5 animate-fade-up overflow-hidden" framed>
            <div className="absolute inset-x-0 top-0 h-[2px] bg-brand-rainbow" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <IconBadge icon={CheckCircle2} tone="green">Import complete</IconBadge>
                <h2 className="mt-3 truncate font-display text-2xl text-cream">{result.project.name}</h2>
                <p className="mt-1 truncate font-mono text-xs text-cream/40">{result.project.repoUrl}</p>
              </div>
              <Link
                href={`/projects/${result.project.id}/task`}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-brand-orange bg-brand-orange px-5 py-2 font-sans text-[0.82rem] font-semibold text-ink-900 transition-all hover:bg-transparent hover:text-brand-orange hover:shadow-glow-orange"
              >
                Run First Task
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
              <SummaryMetric label="Files scanned" value={result.importSummary.filesScanned} />
              <SummaryMetric label="Files indexed" value={result.importSummary.filesIndexed} />
              <SummaryMetric label="Chunks created" value={result.importSummary.chunksCreated} />
              <SummaryMetric label="Memory retained" value={result.importSummary.memoryRetained ? "Yes" : "No"} />
              <SummaryMetric label="Project reused" value={result.importSummary.projectReused ? "Yes" : "No"} />
              <SummaryMetric label="Memory count" value={result.project.memoryCount ?? 0} />
            </div>

            {result.importSummary.warnings.length ? (
              <div className="mt-5 border border-brand-yellow/30 p-4">
                <div className="mb-2 flex items-center gap-2 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-brand-yellow">
                  <TriangleAlert size={15} />
                  Warnings
                </div>
                <ul className="space-y-1 text-sm text-cream/70">
                  {result.importSummary.warnings.map((warning) => (
                    <li key={warning} className="flex gap-2">
                      <span className="text-brand-yellow/70">—</span>
                      {warning}
                    </li>
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
    <div className="bg-ink-900 p-4">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-cream/40">{label}</p>
      <p className="mt-1 font-display text-xl text-cream">{value}</p>
    </div>
  );
}
