import type { CompareResponse, ImportResponse, Memory, MemoryDraft, ProjectBrain, ProjectGraph, ProviderStatus, RagChunk, SystemStatus, TaskRunResponse } from "./types";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function listProjects() {
  return apiFetch<ProjectBrain[]>("/api/projects");
}

export function getProject(projectId: string) {
  return apiFetch<ProjectBrain>(`/api/projects/${encodeURIComponent(projectId)}`);
}

export function importRepo(repoUrl: string) {
  return apiFetch<ImportResponse>("/api/repos/import", {
    method: "POST",
    body: JSON.stringify({ repoUrl }),
  });
}

export function compareChat(projectId: string, message: string) {
  return apiFetch<CompareResponse>("/api/chat/compare", {
    method: "POST",
    body: JSON.stringify({ projectId, message }),
  });
}

export function runTask(projectId: string, message: string, mode: "safe-auto" | "preview-only") {
  return apiFetch<TaskRunResponse>("/api/tasks/run", {
    method: "POST",
    body: JSON.stringify({ projectId, message, mode }),
  });
}

export function retainMemory(projectId: string, memory: MemoryDraft) {
  return apiFetch<{ success: boolean; memory: Memory }>("/api/memory/retain", {
    method: "POST",
    body: JSON.stringify({ projectId, memory }),
  });
}

export function getProjectGraph(projectId: string) {
  return apiFetch<ProjectGraph>(`/api/projects/${encodeURIComponent(projectId)}/graph`);
}

export async function getProjectMemories(projectId: string) {
  const primary = await apiFetch<{ memories: Memory[] }>(`/api/projects/${encodeURIComponent(projectId)}/memory`);
  return primary.memories ?? [];
}

export async function getMemoryDebug(projectId: string) {
  return apiFetch<{ projectId: string; provider: string; memories: Memory[] }>(`/api/memory/${encodeURIComponent(projectId)}`);
}

export async function getRagChunks(projectId: string) {
  const response = await apiFetch<{ projectId: string; chunks: RagChunk[] }>(`/api/rag/${encodeURIComponent(projectId)}/chunks`);
  return response.chunks ?? [];
}

export function getProviderStatus() {
  return apiFetch<ProviderStatus>("/api/memory/provider/status");
}

export function getSystemStatus() {
  return apiFetch<SystemStatus>("/api/system/status");
}
