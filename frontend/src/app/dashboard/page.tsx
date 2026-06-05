"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Database, GitBranch, History, Plus } from "lucide-react";
import { listProjects } from "@/lib/api";
import type { ProjectBrain } from "@/lib/types";
import {
  ButtonLink,
  Card,
  CornerFrame,
  EmptyState,
  ErrorState,
  GradientText,
  HudLabel,
  IconBadge,
  LoadingState,
  PageShell,
} from "@/components/ui";
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

  const totalMemories = projects.reduce((sum, p) => sum + (p.memoryCount ?? 0), 0);
  const totalChunks = projects.reduce((sum, p) => sum + (p.chunkCount ?? 0), 0);

  return (
    <PageShell>
      {/* Hero */}
      <section className="animate-fade-up">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <HudLabel>// Workspace</HudLabel>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-cream sm:text-5xl">
              Project <GradientText>Dashboard</GradientText>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Open a persistent Project Brain or import a public GitHub repository to give your agent durable memory.
            </p>
          </div>
          <ProviderStatusBadge />
        </div>
        <div className="rainbow-rule mt-7 w-full" />
      </section>

      {/* Stat strip */}
      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <StatTile icon={Boxes} label="Project Brains" value={projects.length} tone="purple" />
        <StatTile icon={History} label="Memories Retained" value={totalMemories} tone="green" />
        <StatTile icon={Database} label="Indexed Chunks" value={totalChunks} tone="blue" />
      </section>

      {/* Content */}
      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <HudLabel>Active Brains{projects.length ? ` — ${projects.length}` : ""}</HudLabel>
          <ButtonLink href="/import" variant="ghost">
            <Plus size={15} />
            Import Repo
          </ButtonLink>
        </div>

        {loading ? <LoadingState label="Loading projects..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            body="Import a GitHub repository to create the first Project Brain and start building durable context."
          />
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function ProjectCard({ project, index }: { project: ProjectBrain; index: number }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative block animate-fade-up rounded-xl"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-line bg-ink-800/80 p-5 shadow-hud transition-all duration-300 group-hover:border-brand-purple/40 group-hover:shadow-glow">
        <CornerFrame className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {/* top gradient seam */}
        <div className="absolute inset-x-0 top-0 h-px bg-brand-rainbow opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl text-cream">{project.name}</h2>
            <p className="mt-1 truncate font-mono text-xs text-muted">{project.repoUrl}</p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white/[0.03] text-muted transition-all group-hover:border-brand-orange group-hover:bg-brand-orange group-hover:text-ink-900">
            <ArrowRight size={16} />
          </span>
        </div>

        {project.stack.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.stack.slice(0, 6).map((item) => (
              <IconBadge key={item}>{item}</IconBadge>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniMetric icon={Boxes} label="Modules" value={project.modules.length} />
          <MiniMetric icon={History} label="Memories" value={project.memoryCount ?? 0} />
          <MiniMetric icon={Database} label="Chunks" value={project.chunkCount ?? 0} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-line bg-ink-900/60 px-3 py-2.5">
          <GitBranch size={14} className="mt-0.5 shrink-0 text-brand-teal" />
          <p className="text-sm text-cream-dim">
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted">Last task</span>{" "}
            <span className="block">{project.lastTask || "None recorded"}</span>
          </p>
        </div>
      </div>
    </Link>
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
    <Card className="flex items-center gap-4 !p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-white/[0.03] ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="font-display text-2xl text-cream">{value}</p>
        <HudLabel className="!text-[0.62rem]">{label}</HudLabel>
      </div>
    </Card>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof GitBranch; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-ink-900/50 p-3">
      <Icon className="text-brand-teal" size={16} />
      <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg text-cream">{value}</p>
    </div>
  );
}
