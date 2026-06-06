"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Database, GitBranch, History, Loader2, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { deleteProject, listProjects, syncRepo } from "@/lib/api";
import type { DeleteProjectResponse, ProjectBrain, SyncResponse } from "@/lib/types";
import {
  Button,
  Card,
  CornerFrame,
  EmptyState,
  ErrorState,
  FeatureList,
  FramedTitle,
  HeroQuote,
  HudLabel,
  HudRail,
  IconBadge,
  LoadingState,
  PageShell,
  RobotFace,
  TryLink,
} from "@/components/ui";
import { ProviderStatusBadge } from "@/components/provider-status";

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingProject, setSyncingProject] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResponse>>({});
  const [deleteTarget, setDeleteTarget] = useState<ProjectBrain | null>(null);
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<DeleteProjectResponse | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalMemories = projects.reduce((sum, p) => sum + (p.memoryCount ?? 0), 0);
  const totalChunks = projects.reduce((sum, p) => sum + (p.chunkCount ?? 0), 0);

  async function onSync(projectId: string, forceReindex = false) {
    setSyncingProject(projectId);
    setError(null);
    try {
      const result = await syncRepo(projectId, forceReindex);
      setSyncResults((current) => ({ ...current, [projectId]: result }));
      setProjects(await listProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingProject(null);
    }
  }

  async function onDelete(project: ProjectBrain) {
    setDeletingProject(project.id);
    setError(null);
    try {
      const result = await deleteProject(project.id);
      setDeleteResult(result);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingProject(null);
    }
  }

  return (
    <PageShell>
      <section className="relative mb-14">
        <HudRail className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 2xl:flex" />

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <HeroQuote text="Import a GitHub repo and build a persistent Vikings Brain instantly." />

            <p className="hud-label mb-4 mt-9">Unleash the power of</p>
            <FramedTitle>
              Project
              <br />
              Dashboard
            </FramedTitle>

            <p className="mt-6 max-w-md pl-[1.4rem] text-sm leading-relaxed text-cream/55 sm:text-base">
              Open a persistent Vikings Brain or import a public GitHub repository to give Vikings durable memory.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 pl-[1.4rem]">
              <ProviderStatusBadge />
              <TryLink href="/import">New Vikings Brain</TryLink>
            </div>
          </div>

          <div className="hidden flex-col items-center gap-8 lg:flex lg:w-80">
            <RobotFace />
            <FeatureList items={["Vikings Brains", "RAG Index", "Memory Layer", "Code Graph", "And much more"]} />
          </div>
        </div>
      </section>

      <div className="hairline" />

      <section className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
        <StatTile icon={Boxes} label="Vikings Brains" value={projects.length} tone="purple" />
        <StatTile icon={History} label="Memories Retained" value={totalMemories} tone="green" />
        <StatTile icon={Database} label="Indexed Chunks" value={totalChunks} tone="blue" />
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <HudLabel>{`Active Brains${projects.length ? ` - ${String(projects.length).padStart(2, "0")}` : ""}`}</HudLabel>
        </div>

        {loading ? <LoadingState label="Loading projects..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {deleteResult ? (
          <Card className="mb-5 border-brand-teal/40" framed>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-teal">Project deleted</p>
            <p className="mt-2 text-sm text-cream/70">
              Cleared {deleteResult.deleted.ragChunks} RAG chunk(s), {deleteResult.deleted.tasks} task(s), and{" "}
              {deleteResult.deleted.localMemories} local memory record(s).
            </p>
            {deleteResult.warnings.length ? (
              <div className="mt-3 border border-brand-yellow/30 p-3 text-sm text-brand-yellow">
                {deleteResult.warnings.join(" ")}
              </div>
            ) : null}
          </Card>
        ) : null}
        {!loading && !error && projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            body="Import a GitHub repository to create the first Vikings Brain and start building durable context."
          />
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              syncResult={syncResults[project.id]}
              syncing={syncingProject === project.id}
              deleting={deletingProject === project.id}
              onSync={() => onSync(project.id, false)}
              onDelete={() => setDeleteTarget(project)}
            />
          ))}
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4">
          <Card className="w-full max-w-lg border-brand-coral/40 bg-ink-900" framed>
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-1 shrink-0 text-brand-coral" size={22} />
              <div>
                <h2 className="font-display text-2xl text-cream">Delete this project and its indexed RAG data?</h2>
                <p className="mt-3 text-sm leading-6 text-cream/70">
                  This removes local project cache, RAG chunks, generated tasks, and local runtime memories for{" "}
                  <span className="text-cream">{deleteTarget.name}</span>.
                </p>
                <p className="mt-2 break-all font-mono text-xs text-cream/40">{deleteTarget.repoUrl}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button onClick={() => onDelete(deleteTarget)} disabled={deletingProject === deleteTarget.id} className="border-brand-coral bg-brand-coral hover:text-brand-coral">
                {deletingProject === deleteTarget.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Delete Project
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}

function ProjectCard({
  project,
  index,
  syncResult,
  syncing,
  deleting,
  onSync,
  onDelete,
}: {
  project: ProjectBrain;
  index: number;
  syncResult?: SyncResponse;
  syncing: boolean;
  deleting: boolean;
  onSync: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative animate-fade-up" style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}>
      <div className="relative overflow-hidden border border-line bg-ink-card p-5 transition-colors duration-300 group-hover:border-cream/40">
        <CornerFrame tone="rainbow" className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-brand-rainbow opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="hud-label !text-[0.6rem]">{`Brain // ${String(index + 1).padStart(2, "0")}`}</p>
            <h2 className="mt-1.5 truncate font-display text-xl text-cream">{project.name}</h2>
            <p className="mt-1 truncate font-mono text-xs text-cream/40">{project.repoUrl}</p>
          </div>
          <Link
            href={`/projects/${project.id}/task`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-line text-cream/60 transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-ink-900"
            aria-label={`Open ${project.name}`}
          >
            <ArrowRight size={16} />
          </Link>
        </div>

        {project.stack.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.stack.slice(0, 6).map((item) => (
              <IconBadge key={item}>{item}</IconBadge>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-px border border-line bg-line">
          <MiniMetric icon={Boxes} label="Modules" value={project.modules.length} />
          <MiniMetric icon={History} label="Memories" value={project.memoryCount ?? 0} />
          <MiniMetric icon={Database} label="Chunks" value={project.chunkCount ?? 0} />
        </div>

        <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
          <MiniText label="Indexed" value={project.indexedAt ?? "seed/local"} />
          <MiniText label="RAG" value={`${project.ragProvider ?? "local"} / ${project.embeddingProvider ?? "none"}${project.embeddingModel ? ` ${project.embeddingModel}` : ""}`} />
        </div>

        {syncResult ? (
          <div className="mt-4 border border-brand-blue/30 p-3 text-sm text-brand-blue">
            Sync {syncResult.syncSkipped ? "skipped: repo unchanged" : "complete"} - reindexed {syncResult.filesReindexed} file(s) - embeddings{" "}
            {syncResult.embeddingsGenerated}
          </div>
        ) : null}

        <div className="mt-4 flex items-start gap-2 border border-line px-3 py-2.5">
          <GitBranch size={14} className="mt-0.5 shrink-0 text-brand-teal" />
          <p className="text-sm text-cream/75">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-cream/40">Last task</span>
            <span className="mt-0.5 block">{project.lastTask || "None recorded"}</span>
          </p>
        </div>

        {project.id !== "demo-shopease" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onSync} disabled={syncing}>
              {syncing ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
              Sync Repo
            </Button>
            <Button type="button" variant="ghost" onClick={onDelete} disabled={deleting} className="border-brand-coral/40 text-brand-coral hover:border-brand-coral">
              {deleting ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
              Delete
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof GitBranch;
  label: string;
  value: number;
  tone: "purple" | "green" | "blue";
}) {
  const tones = {
    purple: "text-brand-violet",
    green: "text-brand-teal",
    blue: "text-brand-blue",
  };
  return (
    <div className="flex items-center gap-4 bg-ink-900 p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center border border-line ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="font-display text-3xl leading-none text-cream">{value}</p>
        <p className="hud-label mt-1.5 !text-[0.6rem]">{label}</p>
      </div>
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof GitBranch; label: string; value: string | number }) {
  return (
    <div className="bg-ink-900 p-3">
      <Icon className="text-brand-teal" size={15} />
      <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-cream/40">{label}</p>
      <p className="mt-0.5 font-display text-lg text-cream">{value}</p>
    </div>
  );
}

function MiniText({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900 p-3">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-cream/40">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-cream/70">{value}</p>
    </div>
  );
}
