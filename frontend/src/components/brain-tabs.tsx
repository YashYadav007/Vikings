"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Database, GitGraph, MessageSquareText, ScrollText } from "lucide-react";
import { cn } from "@/lib/format";

const tabs = [
  { label: "Brain", href: "", icon: Brain },
  { label: "Chat", href: "/chat", icon: MessageSquareText },
  { label: "Graph", href: "/graph", icon: GitGraph },
  { label: "Memory", href: "/memory", icon: ScrollText },
  { label: "RAG Chunks", href: "/chunks", icon: Database },
];

export function BrainTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-workspace-border pb-3">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white",
              active && "bg-sky-400/10 text-sky-200 ring-1 ring-sky-400/30",
            )}
          >
            <Icon size={16} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
