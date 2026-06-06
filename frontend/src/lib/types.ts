export type MemoryType = "bug" | "decision" | "style" | "risk" | "preference" | "task" | "architecture" | "follow-up";

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
  status?: "added" | "modified" | "deleted";
  changeSummary: string;
  diff: string;
  originalContentSnippet?: string;
  newContent?: string;
  risk?: string;
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

export type IncrementalRagUpdate = {
  provider: "local" | "pgvector";
  semanticIndex: boolean;
  filesUpdated: number;
  filesDeleted: number;
  chunksInserted: number;
  warnings: string[];
};

export type TaskRunResponse = {
  mode: "safe-auto" | "preview-only";
  agentProvider: "llm" | "mock" | "claude-code";
  memoryProvider?: "local" | "hindsight";
  memoryFallbackUsed?: boolean;
  ragProvider?: "local" | "pgvector";
  semanticSearch?: boolean;
  ragFallbackUsed?: boolean;
  memoryInfluence: string;
  plan: string;
  task: {
    id: string;
    status: string;
    prUrl?: string;
  };
  memoriesUsed: Memory[];
  chunksUsed: RagChunk[];
  patchPreview: PatchPreview[];
  testsToRun: string[];
  risks: string[];
  suggestedMemories?: MemoryDraft[];
  applyResult?: {
    success: boolean;
    branchName?: string;
    commitSha?: string;
    prUrl?: string;
    memoryRetained?: boolean;
    memoryProvider?: "local" | "hindsight";
    memoryFallbackUsed?: boolean;
    incrementalRagUpdate?: IncrementalRagUpdate;
  } | null;
  incrementalRagUpdate?: IncrementalRagUpdate | null;
  savedMemories?: Memory[];
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

export type SystemStatus = {
  backend: "ok";
  memory: {
    provider: "local" | "hindsight";
    configuredProvider: string;
    hindsightConfigured: boolean;
    fallbackMode: string;
  };
  rag: {
    provider: "local" | "pgvector";
    configuredProvider: string;
    pgvectorConfigured: boolean;
    supabaseConfigured: boolean;
    embeddingConfigured: boolean;
    fallbackMode: string;
  };
  llm: {
    mockMode: boolean;
    openaiConfigured: boolean;
  };
  github: {
    tokenConfigured: boolean;
    mockWrite: boolean;
  };
  agent?: {
    provider: "llm" | "mock" | "claude-code";
    configuredProvider: string;
    model: string;
    claudeCodeEnabled: boolean;
  };
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
