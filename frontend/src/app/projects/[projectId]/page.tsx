"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Boxes, Database, History, ShieldAlert } from "lucide-react";
import { BrainTabs } from "@/components/brain-tabs";
import { ProviderStatusBadge } from "@/components/provider-status";
import { Card, ErrorState, IconBadge, LoadingState, PageShell } from "@/components/ui";
import { getProject } from "@/lib/api";
import type { ProjectBrain } from "@/lib/types";

export default function ProjectBrainPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProject(projectId)
      .then(setProject)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />
      {loading ? <div className="mt-6"><LoadingState label="Loading Project Brain..." /></div> : null}
      {error ? <div className="mt-6"><ErrorState message={error} /></div> : null}
      {project ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">{project.name}</h1>
              <p className="mt-2 break-all text-sm text-slate-400">{project.repoUrl}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <IconBadge key={item}>{item}</IconBadge>
                ))}
              </div>
            </div>
            <ProviderStatusBadge />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={Boxes} label="Modules" value={project.modules.length} />
            <Metric icon={History} label="Memories" value={project.memoryCount ?? 0} />
            <Metric icon={Database} label="RAG chunks" value={project.chunkCount ?? 0} />
            <Metric icon={ShieldAlert} label="Risk areas" value={project.riskAreas.length} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <h2 className="text-xl font-semibold text-white">Architecture Summary</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{project.architecture || "No architecture summary available."}</p>
            </Card>
            <Card>
              <h2 className="text-xl font-semibold text-white">Last Task</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{project.lastTask || "No task recorded yet."}</p>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="text-xl font-semibold text-white">Modules</h2>
              <div className="mt-4 space-y-3">
                {project.modules.map((module) => (
                  <div key={module.id} className="rounded-md border border-workspace-border bg-slate-950/40 p-4">
                    <p className="font-semibold text-sky-200">{module.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{module.summary}</p>
                    <p className="mt-2 text-xs text-slate-500">{module.files.length} files</p>
                  </div>
                ))}
                {!project.modules.length ? <p className="text-sm text-slate-400">No modules found.</p> : null}
              </div>
            </Card>
            <Card>
              <h2 className="text-xl font-semibold text-white">Risk Areas</h2>
              <div className="mt-4 space-y-2">
                {project.riskAreas.map((risk) => (
                  <div key={risk} className="rounded-md border border-amber-400/20 bg-amber-950/10 p-3 text-sm text-amber-100/90">
                    {risk}
                  </div>
                ))}
                {!project.riskAreas.length ? <p className="text-sm text-slate-400">No risk areas recorded.</p> : null}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: string | number }) {
  return (
    <Card>
      <Icon className="text-sky-300" size={20} />
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </Card>
  );
}
