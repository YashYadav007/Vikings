export type MemoryType = "bug" | "decision" | "style" | "risk" | "preference" | "task" | "architecture";

export type ProjectModule = {
  id: string;
  name: string;
  summary: string;
  files: string[];
};

export type ProjectBrain = {
  id: string;
  name: string;
  repoUrl: string;
  owner?: string;
  repoName?: string;
  defaultBranch?: string;
  description?: string;
  stack: string[];
  modules: ProjectModule[];
  architecture?: string;
  riskAreas: string[];
  lastTask: string;
  memoryCount?: number;
  chunkCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type RagChunk = {
  id: string;
  projectId: string;
  filePath: string;
  language?: string;
  module: string;
  summary: string;
  content: string;
  startLine?: number;
  endLine?: number;
  symbols?: string[];
  source?: "github" | "seed";
  score?: number;
};

export type Memory = {
  id: string;
  projectId: string;
  type: MemoryType;
  title: string;
  content: string;
  relatedFiles: string[];
  createdAt: string;
  score?: number;
};

export type PatchPreview = {
  filePath: string;
  changeSummary: string;
  diff: string;
};

export type MemoryDraft = {
  type: MemoryType;
  title: string;
  content: string;
  relatedFiles: string[];
  tags?: string[];
};

export type CompareResponse = {
  genericAnswer: string;
  memoryAnswer: string;
  memoryProvider?: "local" | "hindsight";
  chunksUsed: RagChunk[];
  memoriesUsed: Memory[];
  patchPreview: PatchPreview[];
  memoryToSave: MemoryDraft[];
};

export type ImportResponse = {
  project: ProjectBrain;
  importSummary: {
    filesScanned: number;
    filesIndexed: number;
    chunksCreated: number;
    memoryRetained: boolean;
    projectReused: boolean;
    warnings: string[];
  };
};

export type ProviderStatus = {
  activeProvider: "local" | "hindsight";
  configuredProvider: string;
  hindsightConfigured: boolean;
  fallbackMode: string;
  bankIdExample: string;
};

export type GraphNode = {
  id: string;
  type: string;
  data: {
    label: string;
    count?: number;
    [key: string]: unknown;
  };
  position: {
    x: number;
    y: number;
  };
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type ProjectGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
