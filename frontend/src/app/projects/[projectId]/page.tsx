"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Boxes, Database, History, Loader2, ShieldAlert, Trash2, TriangleAlert } from "lucide-react";
import { BrainTabs } from "@/components/brain-tabs";
import { ProviderStatusBadge } from "@/components/provider-status";
import { Card, ErrorState, IconBadge, LoadingState, PageShell } from "@/components/ui";
import { deleteProject, getProject } from "@/lib/api";
import type { DeleteProjectResponse, ProjectBrain } from "@/lib/types";

export default function ProjectBrainPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProject(projectId)
      .then(setProject)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function onDelete() {
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteProject(projectId);
      setDeleteResult(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />
      {loading ? <div className="mt-6"><LoadingState label="Loading Vikings Brain..." /></div> : null}
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

          {project.id !== "demo-shopease" ? (
            <Card className="border-red-400/20 bg-red-950/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Advanced</h2>
                  <p className="mt-1 text-sm text-slate-400">Delete this imported project, its local cache, RAG chunks, tasks, and local runtime memories.</p>
                </div>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-400/30 bg-red-950/20 px-3 text-sm font-semibold text-red-100 hover:bg-red-950/30"
                >
                  <Trash2 size={16} />
                  Delete Project
                </button>
              </div>
              {deleteResult?.warnings.length ? <p className="mt-3 text-sm text-amber-100">{deleteResult.warnings.join(" ")}</p> : null}
            </Card>
          ) : null}

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
      {confirmDelete && project ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
          <Card className="w-full max-w-lg border-red-400/30 bg-slate-950">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-1 text-red-300" size={22} />
              <div>
                <h2 className="text-xl font-semibold text-white">Delete this project and its indexed RAG data?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This removes local project cache, RAG chunks, generated tasks, and local runtime memories for{" "}
                  <span className="font-semibold text-white">{project.name}</span>.
                </p>
                <p className="mt-2 break-all text-xs text-slate-500">{project.repoUrl}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="inline-flex min-h-10 items-center rounded-md border border-workspace-border bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-70"
              >
                {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Delete Project
              </button>
            </div>
          </Card>
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
