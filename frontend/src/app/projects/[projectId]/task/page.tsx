"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { Bot, CheckCircle2, Database, GitPullRequest, History, Loader2, Play, TriangleAlert } from "lucide-react";
import { BrainTabs } from "@/components/brain-tabs";
import { SystemStatusBadges } from "@/components/provider-status";
import { Card, ErrorState, IconBadge, PageShell } from "@/components/ui";
import { runTask } from "@/lib/api";
import { truncate } from "@/lib/format";
import type { TaskRunResponse } from "@/lib/types";

const demoPrompts = [
  "Improve README setup instructions for loading this Manifest V3 Chrome extension.",
  "Add troubleshooting notes without duplicating setup instructions.",
  "Review auth risks and add a concise follow-up note.",
];

const steps = [
  "Recalling Hindsight",
  "Searching semantic RAG",
  "LLM agent planning",
  "Generating patch",
  "Applying safely",
  "Updating RAG",
  "Saving Hindsight memory",
  "Done",
];

export default function TaskRunnerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [message, setMessage] = useState(demoPrompts[0]);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [response, setResponse] = useState<TaskRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      setResponse(await runTask(projectId, message.trim(), previewOnly ? "preview-only" : "safe-auto"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Run a DevContext Task</h1>
          <p className="mt-2 text-slate-400">The coding agent recalls Hindsight, searches RAG, generates a patch, applies safely, updates RAG, and saves learning.</p>
        </div>
        <SystemStatusBadges />
      </div>

      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell DevContext what to change..."
            className="min-h-32 w-full resize-y rounded-md border border-workspace-border bg-slate-950 px-4 py-3 text-white outline-none ring-sky-400/40 transition placeholder:text-slate-600 focus:ring-2"
            required
          />
          <div className="flex flex-wrap gap-2">
            {demoPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setMessage(prompt)} className="rounded-md border border-workspace-border bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10">
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={previewOnly} onChange={(event) => setPreviewOnly(event.target.checked)} className="h-4 w-4 rounded border-workspace-border bg-slate-950" />
              Preview only
            </label>
            <button disabled={loading} className="inline-flex min-h-11 items-center rounded-md bg-sky-400 px-4 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-70">
              {loading ? <Loader2 className="mr-2 animate-spin" size={17} /> : <Play className="mr-2" size={17} />}
              {loading ? "Running task..." : "Run Task"}
            </button>
          </div>
        </form>
      </Card>

      {loading ? <StatusSteps activeCount={previewOnly ? 4 : 7} /> : null}
      {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
      {response ? <TaskResult response={response} /> : null}
    </PageShell>
  );
}

function StatusSteps({ activeCount }: { activeCount: number }) {
  return (
    <Card className="mt-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2 rounded-md border border-workspace-border bg-slate-950/40 p-3 text-sm text-slate-300">
            {index < activeCount ? <Loader2 className="animate-spin text-sky-300" size={16} /> : <span className="h-4 w-4 rounded-full border border-slate-600" />}
            {step}
          </div>
        ))}
      </div>
    </Card>
  );
}

function TaskResult({ response }: { response: TaskRunResponse }) {
  const applied = response.applyResult?.success;
  return (
    <div className="mt-5 space-y-5">
      <Card>
        <div className="flex flex-wrap gap-2">
          <IconBadge icon={Bot} tone={response.agentProvider === "llm" ? "green" : response.agentProvider === "claude-code" ? "purple" : "orange"}>Agent: {response.agentProvider}</IconBadge>
          <IconBadge icon={History} tone={response.memoryProvider === "hindsight" ? "purple" : "blue"}>Memory: {response.memoryProvider ?? "unknown"}</IconBadge>
          <IconBadge icon={Database} tone={response.ragProvider === "pgvector" ? "green" : "blue"}>RAG: {response.ragProvider ?? "unknown"}</IconBadge>
          {response.semanticSearch ? <IconBadge tone="green">Semantic search</IconBadge> : null}
          {response.memoryFallbackUsed ? <IconBadge icon={TriangleAlert} tone="orange">Memory fallback used</IconBadge> : null}
          {response.ragFallbackUsed ? <IconBadge icon={TriangleAlert} tone="orange">RAG fallback used</IconBadge> : null}
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white">Memory influence from previous tasks</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{response.memoryInfluence}</p>
        {applied ? <p className="mt-4 rounded-md border border-green-400/30 bg-green-400/10 p-3 text-sm text-green-100">DevContext saved this task to Hindsight. Future tasks will use this memory.</p> : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Plan</h2>
          <pre className="mt-3 whitespace-pre-wrap rounded-md border border-workspace-border bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">{response.plan}</pre>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-white">Apply / PR Result</h2>
          {response.applyResult ? (
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <IconBadge icon={response.applyResult.success ? CheckCircle2 : TriangleAlert} tone={response.applyResult.success ? "green" : "orange"}>
                {response.applyResult.success ? "Applied" : "Not applied"}
              </IconBadge>
              {response.applyResult.branchName ? <p>Branch: <span className="font-mono text-sky-200">{response.applyResult.branchName}</span></p> : null}
              {response.applyResult.prUrl ? <p className="break-all">PR: <span className="text-sky-200">{response.applyResult.prUrl}</span></p> : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Preview only. No patch was applied.</p>
          )}
        </Card>
      </div>

      <Evidence title="Memories used before task" icon={History} items={response.memoriesUsed.map((memory) => ({ title: memory.title, meta: memory.type, body: memory.content }))} />
      <Evidence title="RAG chunks used" icon={Database} items={response.chunksUsed.map((chunk) => ({ title: chunk.filePath, meta: chunk.module, body: chunk.summary || truncate(chunk.content, 260) }))} />

      <Card>
        <h2 className="text-xl font-semibold text-white">Patch Preview</h2>
        <div className="mt-4 space-y-3">
          {response.patchPreview.map((patch) => (
            <div key={`${patch.filePath}-${patch.changeSummary}`} className="rounded-md border border-workspace-border bg-slate-950/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono font-semibold text-sky-200">{patch.filePath}</p>
                {patch.status ? <IconBadge>{patch.status}</IconBadge> : null}
              </div>
              <p className="mt-2 text-sm text-slate-300">{patch.changeSummary}</p>
              {patch.risk ? <p className="mt-2 text-sm text-amber-200">{patch.risk}</p> : null}
              <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-black/40 p-3 text-xs text-slate-300">{patch.diff}</pre>
            </div>
          ))}
        </div>
      </Card>

      {response.incrementalRagUpdate ? (
        <Card>
          <h2 className="text-xl font-semibold text-white">Incremental RAG Update</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Metric label="Provider" value={response.incrementalRagUpdate.provider} />
            <Metric label="Files updated" value={response.incrementalRagUpdate.filesUpdated} />
            <Metric label="Files deleted" value={response.incrementalRagUpdate.filesDeleted} />
            <Metric label="Chunks inserted" value={response.incrementalRagUpdate.chunksInserted} />
          </div>
        </Card>
      ) : null}

      <Evidence title="Hindsight memories saved after task" icon={GitPullRequest} items={(response.savedMemories ?? []).map((memory) => ({ title: memory.title, meta: memory.type, body: memory.content }))} />
    </div>
  );
}

function Evidence({ title, icon: Icon, items }: { title: string; icon: typeof Database; items: Array<{ title: string; meta?: string; body: string }> }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Icon className="text-sky-300" size={18} />
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-md border border-workspace-border bg-slate-950/50 p-4">
            <p className="break-all font-semibold text-white">{item.title}</p>
            {item.meta ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{item.meta}</p> : null}
            <p className="mt-2 text-sm leading-6 text-slate-300">{truncate(item.body, 360)}</p>
          </div>
        ))}
        {!items.length ? <p className="text-sm text-slate-400">No items returned.</p> : null}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="rounded-md border border-workspace-border bg-slate-950/40 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{String(value)}</p>
    </div>
  );
}
