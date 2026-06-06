"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Bot, Database, GitGraph, MessageSquareText, ScrollText } from "lucide-react";
import { cn } from "@/lib/format";

const tabs = [
  { label: "Task", href: "/task", icon: Bot },
  { label: "Brain", href: "", icon: Brain },
  { label: "Compare Mode (Debug)", href: "/chat", icon: MessageSquareText },
  { label: "Graph", href: "/graph", icon: GitGraph },
  { label: "Memory", href: "/memory", icon: ScrollText },
  { label: "RAG Chunks", href: "/chunks", icon: Database },
];

export function BrainTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-line pb-3">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-transparent px-3 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-cream/55 transition hover:border-line hover:text-cream",
              active && "border-brand-orange/60 bg-brand-orange/10 text-brand-orange",
            )}
          >
            <Icon size={15} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
