import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*  Shell                                                                     */
/* -------------------------------------------------------------------------- */

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-900 text-cream">
      {/* Flat near-black canvas with only a faint top vignette — like the landing hero */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(239,239,229,0.05),transparent_60%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1360px] flex-col px-5 sm:px-8 lg:px-10">
        <TopNav />
        <main className="flex-1 py-12">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-40 -mx-5 flex items-center justify-between border-b border-line bg-ink-900/85 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <Link href="/dashboard" className="group flex items-center gap-2.5">
        <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-[6px]">
          <span className="absolute inset-0 bg-brand-rainbow" />
          <span className="absolute inset-[1.5px] rounded-[4px] bg-ink-900" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-cream" />
        </span>
        <span className="font-display text-[1.15rem] leading-none tracking-[0.12em] text-cream">DEVCONTEXT</span>
      </Link>

      <nav className="flex items-center gap-1 sm:gap-3">
        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/import">Import</NavLink>
        <Link
          href="/import"
          className="ml-1 inline-flex min-h-9 items-center rounded-md border border-brand-orange bg-brand-orange px-4 font-sans text-[0.8rem] font-semibold text-ink-900 transition-all duration-200 hover:bg-transparent hover:text-brand-orange hover:shadow-glow-orange"
        >
          New Brain
        </Link>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded px-2.5 py-2 text-[0.875rem] text-cream/70 transition-colors hover:text-cream"
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-3 border-t border-cream/10 py-7 sm:flex-row sm:justify-between">
      <span className="hud-label">DevContext OS — Memory-powered coding workspace</span>
      <span className="hud-label !tracking-[0.3em]">© 2026</span>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Title + primitives                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The signature landing-page hero title: a small mono pre-title, a large solid
 * Violetsans heading, wrapped by a thin rainbow bracket (top-left) — exactly
 * like "Space Station / AI Detection" on the landing page.
 */
export function FramedTitle({
  pretitle,
  children,
  className,
}: {
  pretitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("title-frame inline-block animate-fade-up", className)}>
      <p className="hud-label mb-3">{pretitle}</p>
      <h1 className="font-display text-4xl leading-[1.02] tracking-tight text-cream sm:text-5xl lg:text-[3.4rem]">
        {children}
      </h1>
    </div>
  );
}

export function HudLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("hud-label", className)}>{children}</span>;
}

/** Small L-shaped corner brackets — the `.corner` motif from the landing page. */
export function CornerFrame({ className, tone = "cream" }: { className?: string; tone?: "cream" | "rainbow" }) {
  const color = tone === "rainbow" ? "border-brand-purple/70" : "border-cream/30";
  const c = `pointer-events-none absolute h-3 w-3 ${color}`;
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      <span className={cn(c, "left-2 top-2 border-l border-t")} />
      <span className={cn(c, "right-2 top-2 border-r border-t")} />
      <span className={cn(c, "bottom-2 left-2 border-b border-l")} />
      <span className={cn(c, "bottom-2 right-2 border-b border-r")} />
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
    <section className={cn("relative border border-cream/15 bg-cream/[0.012] p-5", className)}>
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
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 font-sans text-[0.82rem] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-brand-orange bg-brand-orange text-ink-900 hover:bg-transparent hover:text-brand-orange hover:shadow-glow-orange",
  secondary:
    "border border-cream/20 bg-transparent text-cream hover:border-cream/50",
  ghost:
    "border border-cream/15 bg-transparent text-cream/80 hover:border-cream/40 hover:text-cream",
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
    slate: "border-cream/15 text-cream/80",
    blue: "border-brand-blue/40 text-brand-blue",
    purple: "border-brand-purple/40 text-brand-violet",
    green: "border-brand-teal/40 text-brand-teal",
    orange: "border-brand-yellow/40 text-brand-yellow",
    red: "border-brand-coral/40 text-brand-coral",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.1em]",
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
      <div className="flex items-center gap-3 text-cream/70">
        <Loader2 className="animate-spin text-brand-teal" size={20} />
        <span className="font-mono text-sm tracking-wide">{label}</span>
      </div>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-brand-coral/40">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0 text-brand-coral" size={20} />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-coral">Backend request failed</p>
          <p className="mt-1.5 text-sm text-cream/70">{message}</p>
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center" framed>
      <p className="font-display text-xl text-cream">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-cream/55">{body}</p>
    </Card>
  );
}
