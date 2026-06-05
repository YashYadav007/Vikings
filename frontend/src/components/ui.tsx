import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Boxes, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*  Shell                                                                     */
/* -------------------------------------------------------------------------- */

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-900 text-cream">
      {/* Ambient brand glows — echoes the rainbow robot head on the landing page */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(114,76,232,0.18),transparent_42%),radial-gradient(circle_at_85%_0%,rgba(38,244,208,0.12),transparent_40%),radial-gradient(circle_at_50%_120%,rgba(252,103,86,0.10),transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #efefe5 1px, transparent 1px), linear-gradient(to bottom, #efefe5 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <TopNav />
        <main className="flex-1 py-10">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-40 -mx-4 flex items-center justify-between border-b border-line/80 bg-ink-900/80 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <Link href="/dashboard" className="group flex items-center gap-3">
        <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-md">
          <span className="absolute inset-0 bg-brand-rainbow" />
          <span className="absolute inset-[1.5px] rounded-[5px] bg-ink-900" />
          <Boxes size={18} className="relative text-cream" />
        </span>
        <span className="leading-none">
          <span className="block font-display text-lg tracking-[0.18em] text-cream">DEVCONTEXT</span>
          <span className="hud-label block !text-[0.6rem] !tracking-[0.32em]">Project&nbsp;Brain&nbsp;OS</span>
        </span>
      </Link>

      <nav className="flex items-center gap-1 sm:gap-2">
        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/import">Import</NavLink>
        <Link
          href="/import"
          className="ml-2 inline-flex min-h-9 items-center gap-2 rounded-md border border-brand-orange bg-brand-orange px-3.5 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-ink-900 transition-all hover:bg-transparent hover:text-brand-orange hover:shadow-glow-orange"
        >
          + New Brain
        </Link>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-cream"
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-8 flex flex-col items-center gap-2 border-t border-line/60 py-6 sm:flex-row sm:justify-between">
      <span className="hud-label">DevContext OS — Memory-powered coding workspace</span>
      <div className="rainbow-rule w-24 sm:w-40" />
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

export function HudLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("hud-label", className)}>{children}</span>;
}

export function GradientText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("bg-brand-rainbow bg-clip-text text-transparent", className)}>{children}</span>
  );
}

/** HUD corner brackets — the framing motif from the landing-page hero. */
export function CornerFrame({ className }: { className?: string }) {
  const corner = "pointer-events-none absolute h-3.5 w-3.5 border-cream/25";
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      <span className={cn(corner, "left-2 top-2 border-l border-t")} />
      <span className={cn(corner, "right-2 top-2 border-r border-t")} />
      <span className={cn(corner, "bottom-2 left-2 border-b border-l")} />
      <span className={cn(corner, "bottom-2 right-2 border-b border-r")} />
    </div>
  );
}

export function Card({
  children,
  className,
  framed = false,
}: {
  children: React.ReactNode;
  className?: string;
  framed?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative rounded-xl border border-line bg-ink-800/80 p-5 shadow-hud backdrop-blur-sm",
        className,
      )}
    >
      {framed ? <CornerFrame /> : null}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Buttons                                                                   */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 font-mono text-[0.78rem] font-semibold uppercase tracking-[0.14em] transition-all disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border border-brand-orange bg-brand-orange text-ink-900 hover:bg-transparent hover:text-brand-orange hover:shadow-glow-orange",
  secondary: "border border-brand-purple/60 bg-brand-purple/15 text-brand-violet hover:bg-brand-purple/25 hover:shadow-glow",
  ghost: "border border-line bg-transparent text-cream hover:border-cream/40 hover:bg-white/5",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link href={href} className={cn(buttonBase, buttonVariants[variant])}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: { variant?: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(buttonBase, buttonVariants[variant], className)} {...props}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Badges + states                                                           */
/* -------------------------------------------------------------------------- */

type Tone = "slate" | "blue" | "purple" | "green" | "orange" | "red";

export function IconBadge({
  icon: Icon,
  children,
  tone = "slate",
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  tone?: Tone;
}) {
  const tones: Record<Tone, string> = {
    slate: "border-line bg-white/[0.03] text-cream-dim",
    blue: "border-brand-blue/35 bg-brand-blue/10 text-brand-blue",
    purple: "border-brand-purple/35 bg-brand-purple/10 text-brand-violet",
    green: "border-brand-teal/35 bg-brand-teal/10 text-brand-teal",
    orange: "border-brand-yellow/35 bg-brand-yellow/10 text-brand-yellow",
    red: "border-brand-coral/35 bg-brand-coral/10 text-brand-coral",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.68rem] font-medium uppercase tracking-[0.12em]",
        tones[tone],
      )}
    >
      {Icon ? <Icon size={12} /> : null}
      {children}
    </span>
  );
}

export function LoadingState({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <Card className="flex min-h-56 items-center justify-center" framed>
      <div className="flex items-center gap-3 text-cream-dim">
        <Loader2 className="animate-spin text-brand-teal" size={20} />
        <span className="font-mono text-sm tracking-wide">{label}</span>
      </div>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-brand-coral/40 bg-brand-coral/[0.06]">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0 text-brand-coral" size={20} />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-coral">Backend request failed</p>
          <p className="mt-1.5 text-sm text-cream-dim">{message}</p>
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center" framed>
      <p className="font-display text-xl text-cream">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{body}</p>
    </Card>
  );
}
