"use client";

import { useEffect, useState } from "react";
import { Bot, DatabaseZap, GitBranch, HardDrive, Sparkles } from "lucide-react";
import { getProviderStatus, getSystemStatus } from "@/lib/api";
import type { ProviderStatus, SystemStatus } from "@/lib/types";
import { IconBadge } from "./ui";

export function ProviderStatusBadge() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    getProviderStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) {
    return <IconBadge icon={DatabaseZap}>Memory Provider: unavailable</IconBadge>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <IconBadge icon={DatabaseZap} tone={status.activeProvider === "hindsight" ? "purple" : "blue"}>
        Memory Provider: {status.activeProvider}
      </IconBadge>
      <IconBadge tone={status.hindsightConfigured ? "green" : "orange"}>Hindsight Configured: {String(status.hindsightConfigured)}</IconBadge>
    </div>
  );
}

export function SystemStatusBadges({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    getSystemStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return <IconBadge icon={HardDrive}>Providers unavailable</IconBadge>;

  return (
    <div className="flex flex-wrap gap-2">
      <IconBadge icon={DatabaseZap} tone={status.rag.provider === "pgvector" ? "green" : "blue"}>
        RAG: {status.rag.provider}
      </IconBadge>
      <IconBadge tone={status.memory.provider === "hindsight" ? "purple" : "blue"}>Memory: {status.memory.provider}</IconBadge>
      <IconBadge icon={Bot} tone={status.agent?.provider === "gemini" || status.agent?.provider === "llm" || status.agent?.provider === "openai" ? "green" : status.agent?.provider === "claude-code" ? "purple" : "orange"}>
        Agent: {status.agent?.provider ?? "mock"}
      </IconBadge>
      <IconBadge icon={Sparkles} tone={status.embeddings?.provider === "gemini" ? "green" : status.embeddings?.provider === "openai" ? "blue" : "orange"}>
        Embeddings: {status.embeddings?.provider ?? status.rag.embeddingProvider ?? "unknown"}
      </IconBadge>
      <IconBadge icon={GitBranch} tone={status.github.mockWrite ? "orange" : "green"}>
        GitHub: {status.github.mockWrite ? "mock" : status.github.tokenConfigured ? "token" : "unauthenticated"}
      </IconBadge>
      {!compact && status.agent && status.agent.configured === false ? <IconBadge tone="orange">Agent key missing</IconBadge> : null}
      {!compact && status.embeddings && !status.embeddings.configured ? <IconBadge tone="orange">Embedding key missing</IconBadge> : null}
      {!compact && status.rag.configuredProvider !== status.rag.provider ? <IconBadge tone="orange">RAG fallback</IconBadge> : null}
      {!compact && status.memory.configuredProvider !== status.memory.provider ? <IconBadge tone="orange">Memory fallback</IconBadge> : null}
    </div>
  );
}
