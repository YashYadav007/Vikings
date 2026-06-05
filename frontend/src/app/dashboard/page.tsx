"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Database, GitBranch, History } from "lucide-react";
import { listProjects } from "@/lib/api";
import type { ProjectBrain } from "@/lib/types";
import { EmptyState, ErrorState, IconBadge, LoadingState, PageShell, Card } from "@/components/ui";
import { ProviderStatusBadge } from "@/components/provider-status";

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Project Dashboard</h1>
          <p className="mt-2 text-slate-400">Open a persistent Project Brain or import a public GitHub repository.</p>
        </div>
        <ProviderStatusBadge />
      </div>

      {loading ? <LoadingState label="Loading projects..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && projects.length === 0 ? <EmptyState title="No projects yet" body="Import a GitHub repository to create the first Project Brain." /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col gap-5">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                  <p className="mt-1 break-all text-sm text-slate-400">{project.repoUrl}</p>
                </div>
                <Link href={`/projects/${project.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-sky-400 px-3 text-sm font-semibold text-slate-950 hover:bg-sky-300">
                  Open Project
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <IconBadge key={item}>{item}</IconBadge>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniMetric icon={Boxes} label="Modules" value={project.modules.length} />
              <MiniMetric icon={History} label="Memories" value={project.memoryCount ?? 0} />
              <MiniMetric icon={Database} label="Chunks" value={project.chunkCount ?? 0} />
            </div>
            <div className="rounded-md border border-workspace-border bg-slate-950/40 p-3 text-sm text-slate-300">
              <span className="text-slate-500">Last task:</span> {project.lastTask || "None recorded"}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof GitBranch; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-workspace-border bg-slate-950/40 p-3">
      <Icon className="text-sky-300" size={17} />
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
