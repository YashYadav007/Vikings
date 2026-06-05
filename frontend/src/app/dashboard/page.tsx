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
  FramedTitle,
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
      <section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <FramedTitle pretitle="Workspace / Project Brains">
            Project Dashboard
          </FramedTitle>
          <p className="mt-5 max-w-xl pl-[1.4rem] text-sm leading-relaxed text-cream/55 sm:text-base">
            Open a persistent Project Brain or import a public GitHub repository to give your agent durable memory.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <ProviderStatusBadge />
          <ButtonLink href="/import">
            <Plus size={15} />
            Import Repo
          </ButtonLink>
        </div>
      </section>

      <div className="hairline mt-10" />

      {/* Stat strip */}
      <section className="mt-8 grid gap-px overflow-hidden border border-cream/15 bg-cream/15 sm:grid-cols-3">
        <StatTile icon={Boxes} label="Project Brains" value={projects.length} tone="purple" />
        <StatTile icon={History} label="Memories Retained" value={totalMemories} tone="green" />
        <StatTile icon={Database} label="Indexed Chunks" value={totalChunks} tone="blue" />
      </section>

      {/* Content */}
      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <HudLabel>{`Active Brains${projects.length ? ` — ${String(projects.length).padStart(2, "0")}` : ""}`}</HudLabel>
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
      className="group relative block animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <div className="relative overflow-hidden border border-cream/15 bg-cream/[0.012] p-5 transition-colors duration-300 group-hover:border-cream/35">
        <CornerFrame
          tone="rainbow"
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        {/* rainbow seam appears on hover, echoing the hero stroke */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-brand-rainbow opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="hud-label !text-[0.6rem]">{`Brain // ${String(index + 1).padStart(2, "0")}`}</p>
            <h2 className="mt-1.5 truncate font-display text-xl text-cream">{project.name}</h2>
            <p className="mt-1 truncate font-mono text-xs text-cream/40">{project.repoUrl}</p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-cream/20 text-cream/60 transition-all group-hover:border-brand-orange group-hover:bg-brand-orange group-hover:text-ink-900">
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

        <div className="mt-5 grid grid-cols-3 gap-px border border-cream/15 bg-cream/15">
          <MiniMetric icon={Boxes} label="Modules" value={project.modules.length} />
          <MiniMetric icon={History} label="Memories" value={project.memoryCount ?? 0} />
          <MiniMetric icon={Database} label="Chunks" value={project.chunkCount ?? 0} />
        </div>

        <div className="mt-4 flex items-start gap-2 border border-cream/12 px-3 py-2.5">
          <GitBranch size={14} className="mt-0.5 shrink-0 text-brand-teal" />
          <p className="text-sm text-cream/75">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-cream/40">Last task</span>
            <span className="mt-0.5 block">{project.lastTask || "None recorded"}</span>
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
    <div className="flex items-center gap-4 bg-ink-900 p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center border border-cream/15 ${tones[tone]}`}>
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
