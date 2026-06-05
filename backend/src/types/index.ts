export type ProjectId = "demo-shopease";

export type MemoryType = "bug" | "decision" | "style" | "risk" | "preference" | "task";

export interface ProjectModule {
  id: string;
  name: string;
  summary: string;
  files: string[];
}

export interface ProjectBrain {
  id: ProjectId;
  name: string;
  repoUrl: string;
  stack: string[];
  modules: ProjectModule[];
  riskAreas: string[];
  lastTask: string;
}

export interface RagChunk {
  id: string;
  projectId: ProjectId;
  filePath: string;
  module: string;
  summary: string;
  content: string;
}

export interface ScoredRagChunk extends RagChunk {
  score: number;
}

export interface Memory {
  id: string;
  projectId: ProjectId;
  type: MemoryType;
  title: string;
  content: string;
  relatedFiles: string[];
  createdAt: string;
}

export interface ScoredMemory extends Memory {
  score: number;
}

export interface FileUsed {
  path: string;
  reason: string;
}

export interface MemoryUsed {
  type: MemoryType;
  title: string;
  content: string;
}

export interface PatchPreview {
  filePath: string;
  changeSummary: string;
  diff: string;
}

export interface MemoryDraft {
  type: MemoryType;
  title: string;
  content: string;
  relatedFiles: string[];
}

export interface MemoryPoweredAnswer {
  taskType: string;
  answer: string;
  filesUsed: FileUsed[];
  memoriesUsed: MemoryUsed[];
  patchPreview: PatchPreview[];
  testsToRun: string[];
  risks: string[];
  memoryToSave: MemoryDraft[];
  chunksUsed: ScoredRagChunk[];
  rawMemoriesUsed: ScoredMemory[];
}

export interface GraphNode {
  id: string;
  type: string;
  data: {
    label: string;
    [key: string]: unknown;
  };
  position: {
    x: number;
    y: number;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface ProjectGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GeneratedTask {
  id: string;
  projectId: ProjectId;
  message: string;
  taskType: string;
  createdAt: string;
  chunksUsedCount: number;
  memoriesUsedCount: number;
  patchPreview: PatchPreview[];
  status: "generated";
}
