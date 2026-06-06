"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Database, GitBranch, History } from "lucide-react";
import { listProjects } from "@/lib/api";
import type { ProjectBrain } from "@/lib/types";
import {
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
      {/* Landing-style hero */}
      <section className="relative mb-14">
        <HudRail className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 2xl:flex" />

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <HeroQuote text="Import a GitHub repo and build a persistent Project Brain instantly." />

            <p className="hud-label mb-4 mt-9">Unleash the power of</p>
            <FramedTitle>
              Project
              <br />
              Dashboard
            </FramedTitle>

            <p className="mt-6 max-w-md pl-[1.4rem] text-sm leading-relaxed text-cream/55 sm:text-base">
              Open a persistent Project Brain or import a public GitHub repository to give your agent durable memory.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 pl-[1.4rem]">
              <ProviderStatusBadge />
              <TryLink href="/import">New Project Brain</TryLink>
            </div>
          </div>

          <div className="hidden flex-col items-center gap-8 lg:flex lg:w-80">
            <RobotFace />
            <FeatureList items={["Project Brains", "RAG Index", "Memory Layer", "Code Graph", "And much more"]} />
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* Stat strip */}
      <section className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
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
      <div className="relative overflow-hidden border border-line bg-ink-card p-5 transition-colors duration-300 group-hover:border-cream/40">
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
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-line text-cream/60 transition-all group-hover:border-brand-orange group-hover:bg-brand-orange group-hover:text-ink-900">
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

        <div className="mt-5 grid grid-cols-3 gap-px border border-line bg-line">
          <MiniMetric icon={Boxes} label="Modules" value={project.modules.length} />
          <MiniMetric icon={History} label="Memories" value={project.memoryCount ?? 0} />
          <MiniMetric icon={Database} label="Chunks" value={project.chunkCount ?? 0} />
        </div>

        <div className="mt-4 flex items-start gap-2 border border-line px-3 py-2.5">
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
