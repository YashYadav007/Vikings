"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BrainTabs } from "@/components/brain-tabs";
import { ErrorState, LoadingState, PageShell } from "@/components/ui";
import { getProjectGraph } from "@/lib/api";
import type { ProjectGraph } from "@/lib/types";

const nodeStyles: Record<string, string> = {
  project: "linear-gradient(135deg, #38BDF8, #A78BFA)",
  module: "#0E7490",
  file: "#334155",
  memory: "#15803D",
  risk: "#B45309",
  task: "#6D28D9",
};

export default function GraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [graph, setGraph] = useState<ProjectGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjectGraph(projectId)
      .then(setGraph)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const nodes = useMemo<Node[]>(() => {
    return (graph?.nodes ?? []).map((node) => ({
      ...node,
      data: {
        ...node.data,
        label: (
          <div className="max-w-44">
            <div className="truncate text-sm font-semibold">{node.data.label}</div>
            {node.data.count ? <div className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-80">Count {String(node.data.count)}</div> : null}
          </div>
        ),
      },
      style: {
        minWidth: 150,
        borderRadius: 8,
        border: "1px solid rgba(226, 232, 240, 0.18)",
        background: nodeStyles[node.type] ?? "#334155",
        color: "#F8FAFC",
        padding: 12,
        boxShadow: "0 16px 32px rgba(0, 0, 0, 0.25)",
      },
    }));
  }, [graph]);

  const edges = useMemo<Edge[]>(() => {
    return (graph?.edges ?? []).map((edge) => ({
      ...edge,
      label: edge.label,
      animated: edge.label === "uses" || edge.label === "remembers",
      style: { stroke: "#64748B", strokeWidth: 1.5 },
      labelStyle: { fill: "#CBD5E1", fontSize: 11 },
      labelBgStyle: { fill: "#0F172A", fillOpacity: 0.9 },
    }));
  }, [graph]);

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />
      <div className="mt-6">
        <h1 className="text-3xl font-semibold text-white">Project Graph</h1>
        <p className="mt-2 text-slate-400">Visual Project Brain rendered directly from backend nodes and edges.</p>
      </div>

      {loading ? <div className="mt-5"><LoadingState label="Loading graph..." /></div> : null}
      {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
      {graph ? (
        <div className="mt-5 h-[720px] overflow-hidden rounded-lg border border-workspace-border bg-slate-950">
          <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.2} maxZoom={1.7}>
            <Background color="#1E293B" gap={18} />
            <MiniMap pannable zoomable nodeStrokeColor="#CBD5E1" nodeColor={(node) => String(node.style?.background ?? "#334155")} />
            <Controls />
          </ReactFlow>
        </div>
      ) : null}
    </PageShell>
  );
}
