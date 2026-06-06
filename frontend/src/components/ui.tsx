import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowDown, ChevronLeft, Loader2, Quote } from "lucide-react";
import { cn } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*  Shell                                                                     */
/* -------------------------------------------------------------------------- */

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    // Dead-flat pure-black canvas, exactly like the VIKINGS landing page — no grid, no glow.
    <div className="relative min-h-screen overflow-x-hidden bg-ink-900 text-cream">
      {/* Thin rainbow line across the very top, like the landing page */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-brand-rainbow" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1360px] flex-col px-5 sm:px-8 lg:px-10">
        <TopNav />
        <main className="flex-1 py-12">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

/* Right-edge vertical HUD rail — the landing-page INTRO / MENU / SCROLL indicator. */
export function HudRail({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none select-none flex-col items-center gap-4", className)} aria-hidden>
      <span className="hud-label !text-[0.56rem]">Intro</span>
      <div className="flex flex-col items-center gap-2 py-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-cream/30" />
        ))}
      </div>
      <span className="hud-label !text-[0.56rem]">Menu</span>
      <div className="mt-4 flex flex-col items-center gap-1.5">
        <span className="hud-label !text-[0.56rem]">Scroll</span>
        <ArrowDown size={15} className="text-cream/60" />
      </div>
    </div>
  );
}

/* Right-aligned mono feature labels with a left-extending hairline + chevron. */
export function FeatureList({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)} aria-hidden>
      {items.map((item) => (
        <div key={item} className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <ChevronLeft size={12} className="text-cream/40" />
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-cream/70">{item}</span>
        </div>
      ))}
    </div>
  );
}

/* HUD quote box — the example-prompt callout from the landing hero. */
export function HeroQuote({ text }: { text: string }) {
  return (
    <div className="relative inline-flex max-w-md">
      <CornerFrame className="scale-x-110 opacity-50" />
      <div className="grid h-12 w-12 shrink-0 place-items-center border border-cream/40 text-cream">
        <Quote size={15} />
      </div>
      <div className="flex items-center border border-l-0 border-line px-4 py-2.5">
        <p className="font-mono text-[0.72rem] uppercase leading-relaxed tracking-[0.1em] text-cream/80">{text}</p>
      </div>
    </div>
  );
}

/* Decorative robot face echoing the landing-page robot's rainbow screen. */
export function RobotFace({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square w-40 rounded-[2rem] bg-brand-rainbow p-[5px] sm:w-52", className)}>
      <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] bg-ink-900">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, #353539 1px, transparent 1px), linear-gradient(to bottom, #353539 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-5">
          <span className="h-5 w-5 rounded-full bg-cream" />
          <span className="h-5 w-5 rounded-full bg-cream" />
        </div>
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-40 -mx-5 flex items-center justify-between border-b border-line bg-ink-900/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      {/* Heavy wordmark + vertical divider — mirrors the landing-page logo lockup */}
      <Link href="/dashboard" className="flex items-center gap-5">
        <span className="font-sans text-2xl font-extrabold tracking-tight text-cream">VIKINGS</span>
        <span className="hidden h-7 w-px bg-line sm:block" />
        <span className="hidden font-mono text-[0.62rem] uppercase tracking-[0.28em] text-cream/45 sm:block">
          Memory-Powered Agent
        </span>
      </Link>

      {/* Two chunky orange buttons, like the landing nav */}
      <nav className="flex items-center gap-3">
        <NavButton href="/dashboard">Dashboard</NavButton>
        <NavButton href="/import">Import Repo</NavButton>
      </nav>
    </header>
  );
}

function NavButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-brand-orange bg-brand-orange px-5 py-2.5 font-sans text-[0.9rem] font-semibold text-ink-900 transition-all duration-200 hover:bg-transparent hover:text-brand-orange hover:shadow-glow-orange"
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-3 border-t border-line py-7 sm:flex-row sm:justify-between">
      <span className="hud-label">VIKINGS — Memory-powered coding workspace</span>
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
  pretitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("title-frame inline-block animate-fade-up", className)}>
      <div className="title-frame-br">
        {pretitle ? <p className="hud-label mb-3">{pretitle}</p> : null}
        <h1 className="font-display text-[2.5rem] leading-[1.04] tracking-tight text-cream sm:text-5xl lg:text-[3.6rem]">
          {children}
        </h1>
      </div>
    </div>
  );
}

/** Rainbow-stroked up-right arrow — the icon used inside the landing "TRY NOW" buttons. */
export function RainbowArrow({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="rainbow-arrow" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fc6756" />
          <stop offset="0.5" stopColor="#f8cf3e" />
          <stop offset="1" stopColor="#26f4d0" />
        </linearGradient>
      </defs>
      <path d="M7 17 17 7M9 7h8v8" stroke="url(#rainbow-arrow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Landing-page "TRY NOW" style: bordered box, mono uppercase label, rainbow arrow. */
export function TryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-between gap-6 border border-line px-5 py-3 font-mono text-[0.74rem] uppercase tracking-[0.18em] text-cream transition-colors hover:border-cream/50"
    >
      <span>{children}</span>
      <RainbowArrow size={18} />
    </Link>
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
    <section className={cn("relative border border-line bg-ink-card p-5", className)}>
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
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-2.5 font-sans text-[0.9rem] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-brand-orange bg-brand-orange text-ink-900 hover:bg-transparent hover:text-brand-orange hover:shadow-glow-orange",
  secondary:
    "border border-line bg-transparent text-cream hover:border-cream/50",
  ghost:
    "border border-line bg-transparent text-cream/80 hover:border-cream/40 hover:text-cream",
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
    slate: "border-line text-cream/80",
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
