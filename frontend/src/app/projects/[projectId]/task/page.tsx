"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { Bot, CheckCircle2, Database, GitPullRequest, History, Loader2, Play, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { BrainTabs } from "@/components/brain-tabs";
import { SystemStatusBadges } from "@/components/provider-status";
import { Button, Card, ErrorState, FramedTitle, HudLabel, IconBadge, PageShell } from "@/components/ui";
import { runGitCodeTokenSafetyDemo, runTask, syncRepo } from "@/lib/api";
import { truncate } from "@/lib/format";
import type { SyncResponse, TaskRunResponse } from "@/lib/types";

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
  const [demoProofVisible, setDemoProofVisible] = useState(false);
  const [demoLoading, setDemoLoading] = useState<"preview-only" | "safe-auto" | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    setDemoProofVisible(false);
    try {
      setResponse(await runTask(projectId, message.trim(), previewOnly ? "preview-only" : "safe-auto"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task run failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRunDemo(mode: "preview-only" | "safe-auto") {
    setDemoLoading(mode);
    setError(null);
    setResponse(null);
    setDemoProofVisible(false);
    try {
      const result = await runGitCodeTokenSafetyDemo(projectId, mode);
      setResponse(result);
      setDemoProofVisible(Boolean(result.applyResult?.success));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Curated demo failed");
    } finally {
      setDemoLoading(null);
    }
  }

  async function onSync(forceReindex: boolean) {
    setSyncing(true);
    setError(null);
    try {
      setSyncResult(await syncRepo(projectId, forceReindex));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <FramedTitle pretitle="Agent / Execute">Run Task</FramedTitle>
          <p className="mt-5 max-w-xl pl-[1.4rem] text-sm leading-relaxed text-cream/55 sm:text-base">
            Agent Vikings recalls Hindsight, searches RAG, generates a patch, applies safely, updates RAG, and saves
            learning.
          </p>
        </div>
        <SystemStatusBadges />
      </div>

      <div className="hairline mt-10" />

      {projectId === "github-yashyadav007-gitcode" ? (
        <Card className="mt-7 border-brand-teal/40" framed>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <IconBadge icon={Sparkles} tone="green">Curated Demo Task</IconBadge>
              <h2 className="mt-3 font-display text-2xl text-cream">Add a GitHub token safety guard</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cream/70">
                Add a GitHub token safety guard using RAG + Hindsight, then create a PR.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onRunDemo("preview-only")} disabled={Boolean(demoLoading)}>
                {demoLoading === "preview-only" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                Preview Demo Patch
              </Button>
              <Button onClick={() => onRunDemo("safe-auto")} disabled={Boolean(demoLoading)}>
                {demoLoading === "safe-auto" ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                Run Demo and Create PR
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mt-7" framed>
        <div className="mb-5 border border-line bg-ink-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <HudLabel>Repo Index Controls</HudLabel>
              <p className="mt-2 text-sm text-cream/55">Sync is explicit. Cached projects are reused until you sync or force re-index.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => onSync(false)} disabled={syncing || projectId === "demo-shopease"}>
                {syncing ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
                Sync Repo
              </Button>
              <Button type="button" variant="ghost" onClick={() => onSync(true)} disabled={syncing || projectId === "demo-shopease"}>
                Force Re-index
              </Button>
            </div>
          </div>
          {syncResult ? (
            <div className="mt-4 border border-brand-blue/30 p-3 text-sm text-brand-blue">
              Sync {syncResult.syncSkipped ? "skipped because the branch commit is unchanged" : "complete"} - reindexed {syncResult.filesReindexed} file(s) - skipped{" "}
              {syncResult.filesSkippedUnchanged} - embeddings {syncResult.embeddingsGenerated}
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <label className="block">
            <HudLabel>Task Instruction</HudLabel>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell Vikings what to change..."
              className="mt-2 min-h-32 w-full resize-y border border-line bg-ink-900 px-4 py-3 font-mono text-sm leading-6 text-cream outline-none transition placeholder:text-cream/30 focus:border-brand-purple/60"
              required
            />
          </label>

          <div>
            <HudLabel>Example Prompts</HudLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {demoPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className="border border-line px-3 py-2 text-left font-mono text-[0.72rem] text-cream/60 transition hover:border-cream/40 hover:text-cream"
                >
                  {truncate(prompt, 64)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-cream/70">
              <input
                type="checkbox"
                checked={previewOnly}
                onChange={(event) => setPreviewOnly(event.target.checked)}
                className="h-4 w-4 cursor-pointer border border-line bg-ink-900 accent-brand-orange"
              />
              Preview only
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
              {loading ? "Running task..." : "Run Task"}
            </Button>
          </div>
        </form>
      </Card>

      {loading ? <StatusSteps activeCount={previewOnly ? 4 : 7} /> : null}
      {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
      {response ? <TaskResult response={response} demoProofVisible={demoProofVisible} /> : null}
    </PageShell>
  );
}

function StatusSteps({ activeCount }: { activeCount: number }) {
  return (
    <Card className="mt-5">
      <HudLabel>Pipeline</HudLabel>
      <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2 bg-ink-900 p-3">
            {index < activeCount ? (
              <Loader2 className="animate-spin text-brand-teal" size={15} />
            ) : (
              <span className="h-3.5 w-3.5 rounded-full border border-line" />
            )}
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-cream/75">{step}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TaskResult({ response, demoProofVisible = false }: { response: TaskRunResponse; demoProofVisible?: boolean }) {
  const applied = response.applyResult?.success;
  return (
    <div className="mt-5 space-y-5">
      <Card className="relative overflow-hidden" framed>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-brand-rainbow" />
        <div className="flex flex-wrap gap-2">
          <IconBadge icon={Bot} tone={response.agentProvider === "gemini" || response.agentProvider === "llm" || response.agentProvider === "openai" || response.agentProvider === "curated-demo" ? "green" : response.agentProvider === "claude-code" ? "purple" : "orange"}>Agent: {response.agentProvider}</IconBadge>
          {response.agentModel ? <IconBadge tone="blue">Model: {response.agentModel}</IconBadge> : null}
          <IconBadge icon={History} tone={response.memoryProvider === "hindsight" ? "purple" : "blue"}>Memory: {response.memoryProvider ?? "unknown"}</IconBadge>
          <IconBadge icon={Database} tone={response.ragProvider === "pgvector" ? "green" : "blue"}>RAG: {response.ragProvider ?? "unknown"}</IconBadge>
          {response.semanticSearch ? <IconBadge tone="green">Semantic search</IconBadge> : null}
          {response.memoryFallbackUsed ? <IconBadge icon={TriangleAlert} tone="orange">Memory fallback used</IconBadge> : null}
          {response.ragFallbackUsed ? <IconBadge icon={TriangleAlert} tone="orange">RAG fallback used</IconBadge> : null}
        </div>
        <h2 className="mt-5 font-display text-xl text-cream">Memory influence from previous tasks</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-cream/75">{response.memoryInfluence}</p>
        {applied ? (
          <p className="mt-4 border border-brand-teal/30 bg-brand-teal/[0.06] p-3 text-sm text-brand-teal">
            DevContext saved this task to Hindsight. Future tasks will use this memory.
          </p>
        ) : null}
        {demoProofVisible ? (
          <div className="mt-4 border border-brand-blue/30 bg-brand-blue/[0.06] p-4 text-sm leading-6 text-brand-blue">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-cream">Demo proof</p>
            <p className="mt-2">
              DevContext used RAG to locate extension token-related files, used Hindsight to recall token/security risks, changed only relevant files,
              created a PR, updated RAG for changed files, and saved the task outcome back to Hindsight.
            </p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="font-display text-xl text-cream">Plan</h2>
          <pre className="mt-3 whitespace-pre-wrap border border-line bg-ink-900 p-4 font-mono text-sm leading-6 text-cream/80">{response.plan}</pre>
        </Card>
        <Card>
          <h2 className="font-display text-xl text-cream">Apply / PR Result</h2>
          {response.applyResult ? (
            <div className="mt-3 space-y-2 text-sm text-cream/75">
              <IconBadge icon={response.applyResult.success ? CheckCircle2 : TriangleAlert} tone={response.applyResult.success ? "green" : "orange"}>
                {response.applyResult.success ? "Applied" : "Not applied"}
              </IconBadge>
              {response.applyResult.branchName ? (
                <p>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-cream/40">Branch</span>{" "}
                  <span className="font-mono text-brand-teal">{response.applyResult.branchName}</span>
                </p>
              ) : null}
              {response.applyResult.prUrl ? (
                <p className="break-all">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-cream/40">PR</span>{" "}
                  <span className="text-brand-blue">{response.applyResult.prUrl}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-cream/55">Preview only. No patch was applied.</p>
          )}
        </Card>
      </div>

      <Evidence title="Memories used before task" icon={History} items={response.memoriesUsed.map((memory) => ({ title: memory.title, meta: memory.type, body: memory.content }))} />
      <Evidence title="RAG chunks used" icon={Database} items={response.chunksUsed.map((chunk) => ({ title: chunk.filePath, meta: chunk.module, body: chunk.summary || truncate(chunk.content, 260) }))} />

      <Card>
        <h2 className="font-display text-xl text-cream">Patch Preview</h2>
        <div className="mt-4 space-y-3">
          {response.patchPreview.map((patch) => (
            <div key={`${patch.filePath}-${patch.changeSummary}`} className="border border-line bg-ink-900 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-semibold text-brand-teal">{patch.filePath}</p>
                {patch.status ? <IconBadge>{patch.status}</IconBadge> : null}
              </div>
              <p className="mt-2 text-sm text-cream/75">{patch.changeSummary}</p>
              {patch.risk ? <p className="mt-2 text-sm text-brand-yellow">{patch.risk}</p> : null}
              <pre className="mt-3 max-h-72 overflow-auto border border-line bg-ink-950 p-3 font-mono text-xs leading-5 text-cream/70">{patch.diff}</pre>
            </div>
          ))}
        </div>
      </Card>

      {response.incrementalRagUpdate ? (
        <Card>
          <h2 className="font-display text-xl text-cream">Incremental RAG Update</h2>
          <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-4">
            <Metric label="Provider" value={response.incrementalRagUpdate.provider} />
            <Metric label="Files updated" value={response.incrementalRagUpdate.filesUpdated} />
            <Metric label="Files deleted" value={response.incrementalRagUpdate.filesDeleted} />
            <Metric label="Chunks inserted" value={response.incrementalRagUpdate.chunksInserted} />
          </div>
        </Card>
      ) : null}

      {response.hindsightRetention ? (
        <Card>
          <h2 className="font-display text-xl text-cream">Hindsight Retention</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <IconBadge tone={response.hindsightRetention.provider === "hindsight" ? "purple" : "blue"}>Provider: {response.hindsightRetention.provider}</IconBadge>
            {response.hindsightRetention.fallbackUsed ? <IconBadge tone="orange">Fallback used</IconBadge> : null}
            <IconBadge tone="green">Retained {response.hindsightRetention.retained.length}</IconBadge>
            <IconBadge tone="orange">Skipped {response.hindsightRetention.skipped.length}</IconBadge>
            <IconBadge tone="orange">Duplicates skipped {response.hindsightRetention.duplicatesSkipped}</IconBadge>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <HudLabel>Retained</HudLabel>
              <div className="mt-2 space-y-2">
                {response.hindsightRetention.retained.map((item) => (
                  <div key={item.memoryKey} className="border border-brand-teal/20 bg-brand-teal/[0.04] p-3 text-sm text-brand-teal">
                    {item.type}: {item.title} - importance {item.importance}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <HudLabel>Skipped</HudLabel>
              <div className="mt-2 space-y-2">
                {response.hindsightRetention.skipped.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="border border-brand-yellow/20 bg-brand-yellow/[0.04] p-3 text-sm text-brand-yellow">
                    {item.type}: {item.title} - {item.reason}
                  </div>
                ))}
              </div>
            </div>
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
        <Icon className="text-brand-teal" size={17} />
        <h2 className="font-display text-xl text-cream">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="border border-line bg-ink-900 p-4">
            <p className="break-all font-display text-base text-cream">{item.title}</p>
            {item.meta ? <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-cream/40">{item.meta}</p> : null}
            <p className="mt-2 text-sm leading-6 text-cream/70">{truncate(item.body, 360)}</p>
          </div>
        ))}
        {!items.length ? <p className="text-sm text-cream/50">No items returned.</p> : null}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="bg-ink-900 p-4">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-cream/40">{label}</p>
      <p className="mt-1 font-display text-lg text-cream">{String(value)}</p>
    </div>
  );
}
