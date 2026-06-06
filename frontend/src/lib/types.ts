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
  lastIndexedCommitSha?: string;
  indexedAt?: string;
  ragProvider?: "local" | "pgvector";
  semanticIndex?: boolean;
  embeddingProvider?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  fileHashes?: Record<string, string>;
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
  memoryKey?: string;
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
  agentProvider: "gemini" | "openai" | "llm" | "ollama" | "mock" | "claude-code" | "curated-demo";
  agentModel?: string;
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
  hindsightRetention?: {
    provider: "local" | "hindsight";
    fallbackUsed: boolean;
    retained: Array<{ type: MemoryType; title: string; memoryKey: string; importance: number }>;
    skipped: Array<{ type: MemoryType; title: string; reason: string; importance: number }>;
    duplicatesSkipped: number;
  } | null;
};

export type ImportResponse = {
  project: ProjectBrain;
  importSummary: {
    filesScanned: number;
    filesIndexed: number;
    chunksCreated: number;
    memoryRetained: boolean;
    memoryProvider?: "local" | "hindsight";
    memoryFallbackUsed?: boolean;
    projectReused: boolean;
    cacheHit?: boolean;
    reindexed?: boolean;
    embeddingsGenerated?: number;
    filesSkippedUnchanged?: number;
    filesReindexed?: number;
    changedFiles?: string[];
    ragProvider?: "local" | "pgvector";
    semanticIndex?: boolean;
    embeddingProvider?: string;
    embeddingModel?: string;
    embeddingDimensions?: number;
    indexedAt?: string;
    lastIndexedCommitSha?: string;
    warnings: string[];
  };
};

export type SyncResponse = {
  projectId: string;
  syncSkipped: boolean;
  cacheHit: boolean;
  changedFiles: string[];
  filesReindexed: number;
  filesSkippedUnchanged: number;
  embeddingsGenerated: number;
  ragProvider?: "local" | "pgvector";
  semanticIndex?: boolean;
  embeddingProvider?: string;
  embeddingModel?: string;
  warnings: string[];
};

export type DeleteProjectResponse = {
  success: boolean;
  projectId: string;
  deleted: {
    project: boolean;
    ragChunks: number;
    tasks: number;
    localMemories: number;
    cache: boolean;
  };
  hindsight: {
    provider: "local" | "hindsight";
    remoteDeleteSupported: boolean;
    action: string;
  };
  warnings: string[];
};

export type DemoTaskResponse = TaskRunResponse & {
  success: boolean;
  projectId: string;
  agentProvider: "curated-demo";
  agentModel: "gitcode-token-safety-demo";
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
    embeddingProvider?: string;
    fallbackMode: string;
    embeddingModel?: string;
    embeddingDimensions?: number;
  };
  embeddings?: {
    provider?: string;
    model?: string;
    dimensions?: number;
    configured: boolean;
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
    provider: "gemini" | "openai" | "llm" | "ollama" | "mock" | "claude-code" | "curated-demo";
    configuredProvider: string;
    model: string;
    configured?: boolean;
    claudeCodeEnabled: boolean;
  };
  cache?: {
    disableAutoReindex: boolean;
    maxEmbeddingFilesPerImport: number;
    maxEmbeddingChunksPerImport: number;
    maxAgentContextChunks: number;
  };
};

export type MemoryQualityReport = {
  projectId: string;
  provider: "local" | "hindsight";
  totalMemories: number;
  duplicateGroups: Array<{ normalizedKey: string; count: number; memories: Memory[] }>;
  noisyMemories: Memory[];
  recommendedKeep: Memory[];
  recommendedArchive: Memory[];
  latestArchitectureMemory: Memory | null;
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
