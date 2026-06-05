import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, BrainCircuit, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-workspace-bg text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_32rem),radial-gradient(circle_at_top_right,rgba(167,139,250,0.12),transparent_30rem)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <TopNav />
        <main className="flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <header className="flex items-center justify-between border-b border-workspace-border pb-4">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-300">
          <BrainCircuit size={21} />
        </span>
        <span>
          <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">DevContext</span>
          <span className="block text-xs text-slate-400">Project Brain Workspace</span>
        </span>
      </Link>
      <nav className="flex items-center gap-2 text-sm text-slate-300">
        <Link className="rounded-md px-3 py-2 hover:bg-white/5 hover:text-white" href="/dashboard">
          Dashboard
        </Link>
        <Link className="rounded-md px-3 py-2 hover:bg-white/5 hover:text-white" href="/import">
          Import
        </Link>
      </nav>
    </header>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-workspace-border bg-workspace-card/90 p-5 shadow-glow", className)}>{children}</section>;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition",
        variant === "primary" ? "bg-sky-400 text-slate-950 hover:bg-sky-300" : "border border-workspace-border bg-white/5 text-slate-100 hover:bg-white/10",
      )}
    >
      {children}
    </Link>
  );
}

export function IconBadge({ icon: Icon, children, tone = "slate" }: { icon?: LucideIcon; children: React.ReactNode; tone?: "slate" | "blue" | "purple" | "green" | "orange" | "red" }) {
  const tones = {
    slate: "border-slate-700 bg-slate-900 text-slate-300",
    blue: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    purple: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    green: "border-green-400/30 bg-green-400/10 text-green-300",
    orange: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    red: "border-red-400/30 bg-red-400/10 text-red-300",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium", tones[tone])}>
      {Icon ? <Icon size={13} /> : null}
      {children}
    </span>
  );
}

export function LoadingState({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <Card className="flex min-h-56 items-center justify-center">
      <div className="flex items-center gap-3 text-slate-300">
        <Loader2 className="animate-spin text-sky-300" size={20} />
        <span>{label}</span>
      </div>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-red-400/30 bg-red-950/20">
      <div className="flex items-start gap-3 text-red-100">
        <AlertCircle className="mt-0.5 text-red-300" size={20} />
        <div>
          <p className="font-semibold">Backend request failed</p>
          <p className="mt-1 text-sm text-red-200/80">{message}</p>
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{body}</p>
    </Card>
  );
}
