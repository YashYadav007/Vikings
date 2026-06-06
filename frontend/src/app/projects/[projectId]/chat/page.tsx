"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Database, History, Loader2, Save, Sparkles } from "lucide-react";
import { BrainTabs } from "@/components/brain-tabs";
import { Card, ErrorState, IconBadge, PageShell } from "@/components/ui";
import { compareChat, retainMemory } from "@/lib/api";
import { truncate } from "@/lib/format";
import type { CompareResponse, MemoryDraft } from "@/lib/types";

const prompts = ["Add coupon discount support", "Summarize this project architecture", "Find auth-related risk areas"];

export default function ChatComparePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    setSaved({});
    try {
      setResponse(await compareChat(projectId, message.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compare request failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveMemory(memory: MemoryDraft, index: number) {
    await retainMemory(projectId, memory);
    setSaved((current) => ({ ...current, [index]: true }));
  }

  return (
    <PageShell>
      <BrainTabs projectId={projectId} />
      <div className="mt-6">
        <h1 className="text-3xl font-semibold text-white">Compare Mode (Debug)</h1>
        <p className="mt-2 text-slate-400">Debug the difference between generic AI and DevContext AI. Use the Task tab for the primary coding-agent workflow.</p>
      </div>

      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={prompts[0]}
            className="min-h-28 w-full resize-y rounded-md border border-workspace-border bg-slate-950 px-4 py-3 text-white outline-none ring-sky-400/40 transition placeholder:text-slate-600 focus:ring-2"
            required
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => setMessage(prompt)} className="rounded-md border border-workspace-border bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10">
                  {prompt}
                </button>
              ))}
            </div>
            <button disabled={loading} className="inline-flex min-h-11 items-center rounded-md bg-sky-400 px-4 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-70">
              {loading ? <Loader2 className="mr-2 animate-spin" size={17} /> : <Sparkles className="mr-2" size={17} />}
              Compare
            </button>
          </div>
        </form>
      </Card>

      {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}

      {response ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <AnswerPanel title="Generic AI" body={response.genericAnswer} />
            <AnswerPanel title="DevContext AI" body={response.memoryAnswer} badge={response.memoryProvider} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <EvidenceSection title="Chunks Used" icon={Database} items={response.chunksUsed.map((chunk) => ({ title: chunk.filePath, meta: chunk.module, body: chunk.summary || truncate(chunk.content) }))} />
            <EvidenceSection title="Memories Used" icon={History} items={response.memoriesUsed.map((memory) => ({ title: memory.title, meta: memory.type, body: memory.content }))} />
          </div>

          <Card>
            <h2 className="text-xl font-semibold text-white">Patch Preview</h2>
            <div className="mt-4 space-y-3">
              {response.patchPreview.map((patch) => (
                <div key={`${patch.filePath}-${patch.changeSummary}`} className="rounded-md border border-workspace-border bg-slate-950/50 p-4">
                  <p className="font-semibold text-sky-200">{patch.filePath}</p>
                  <p className="mt-1 text-sm text-slate-300">{patch.changeSummary}</p>
                  <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-black/40 p-3 text-xs text-slate-300">{patch.diff}</pre>
                </div>
              ))}
              {!response.patchPreview.length ? <p className="text-sm text-slate-400">No patch preview returned.</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-white">Memory To Save</h2>
            <div className="mt-4 space-y-3">
              {response.memoryToSave.map((memory, index) => (
                <div key={`${memory.title}-${index}`} className="rounded-md border border-workspace-border bg-slate-950/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <IconBadge tone="green">{memory.type}</IconBadge>
                      <p className="mt-3 font-semibold text-white">{memory.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{memory.content}</p>
                      <p className="mt-2 text-xs text-slate-500">{memory.relatedFiles.join(", ") || "No related files"}</p>
                    </div>
                    <button onClick={() => saveMemory(memory, index)} disabled={saved[index]} className="inline-flex min-h-10 items-center justify-center rounded-md border border-green-400/30 bg-green-400/10 px-3 text-sm font-semibold text-green-200 hover:bg-green-400/20 disabled:opacity-70">
                      {saved[index] ? <CheckCircle2 className="mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                      {saved[index] ? "Saved" : "Save Suggested Memory"}
                    </button>
                  </div>
                </div>
              ))}
              {!response.memoryToSave.length ? <p className="text-sm text-slate-400">No suggested memory returned.</p> : null}
            </div>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}

function AnswerPanel({ title, body, badge }: { title: string; body: string; badge?: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {badge ? <IconBadge tone="purple">Provider: {badge}</IconBadge> : null}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{body}</p>
    </Card>
  );
}

function EvidenceSection({ title, icon: Icon, items }: { title: string; icon: typeof Database; items: { title: string; meta: string; body: string }[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Icon className="text-sky-300" size={18} />
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.title}-${item.meta}`} className="rounded-md border border-workspace-border bg-slate-950/50 p-4">
            <p className="font-semibold text-sky-200">{item.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{item.meta}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
          </div>
        ))}
        {!items.length ? <p className="text-sm text-slate-400">No evidence returned.</p> : null}
      </div>
    </Card>
  );
}
