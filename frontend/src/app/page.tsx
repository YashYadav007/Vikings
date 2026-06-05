import { ArrowRight, BrainCircuit, Database, GitGraph, History, Sparkles } from "lucide-react";
import { ButtonLink, Card, IconBadge, PageShell } from "@/components/ui";
import { ProviderStatusBadge } from "@/components/provider-status";

export default function LandingPage() {
  return (
    <PageShell>
      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            <IconBadge icon={Sparkles} tone="blue">
              Memory-powered coding workspace
            </IconBadge>
            <ProviderStatusBadge />
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">Every repo gets its own AI brain.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Stop re-explaining your codebase. DevContext OS remembers your project across tasks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/projects/demo-shopease">
              Open Demo Project
              <ArrowRight className="ml-2" size={17} />
            </ButtonLink>
            <ButtonLink href="/import" variant="secondary">
              Import GitHub Repo
            </ButtonLink>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-workspace-border bg-slate-950/50 px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="h-3 w-3 rounded-full bg-workspace-error" />
              <span className="h-3 w-3 rounded-full bg-workspace-warning" />
              <span className="h-3 w-3 rounded-full bg-workspace-success" />
              <span className="ml-2">project-brain.json</span>
            </div>
          </div>
          <div className="space-y-4 p-5 font-mono text-sm">
            <p className="text-sky-300">Project: demo-shopease</p>
            <p className="text-violet-300">Modules: cart, checkout, auth</p>
            <p className="text-green-300">Memory: coupon logic follows quantity normalization</p>
            <p className="text-amber-300">Risk: checkout calculations affect payment totals</p>
            <div className="rounded-md border border-workspace-border bg-slate-950/60 p-4 text-slate-300">
              DevContext AI uses code chunks plus project journey memory before generating guidance.
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <IconBadge icon={Database} tone="blue">
            RAG
          </IconBadge>
          <h2 className="mt-4 text-xl font-semibold text-white">Codebase Knowledge</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Static repository context: files, functions, APIs, README content, and indexed chunks.</p>
        </Card>
        <Card>
          <IconBadge icon={History} tone="green">
            Memory
          </IconBadge>
          <h2 className="mt-4 text-xl font-semibold text-white">Project Journey</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Bugs, fixes, decisions, preferences, risks, and tasks retained as the project evolves.</p>
        </Card>
        <Card>
          <IconBadge icon={GitGraph} tone="purple">
            Graph
          </IconBadge>
          <h2 className="mt-4 text-xl font-semibold text-white">Visual Project Brain</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">A connected map from project to modules, files, tasks, memories, and risk areas.</p>
        </Card>
      </section>
    </PageShell>
  );
}
