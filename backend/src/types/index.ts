export type ProjectId = string;

export type MemoryType = "bug" | "decision" | "style" | "risk" | "preference" | "task" | "architecture";

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
}

export interface RagChunk {
  id: string;
  projectId: ProjectId;
  filePath: string;
  language?: string;
  module: string;
  summary: string;
  content: string;
  startLine?: number;
  endLine?: number;
  symbols?: string[];
  source?: "github" | "seed";
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

export interface ExecutablePatch extends PatchPreview {
  originalContentSnippet: string;
  newContent: string;
  risk: string;
}

export interface MemoryDraft {
  type: MemoryType;
  title: string;
  content: string;
  relatedFiles: string[];
  tags?: string[];
}

export interface MemoryReflection {
  provider: "local" | "hindsight";
  reflection: string;
  suggestedMemories: MemoryDraft[];
  fallbackReflectionUsed?: boolean;
}

export interface MemoryProviderStatus {
  activeProvider: "local" | "hindsight";
  configuredProvider: string;
  hindsightConfigured: boolean;
  fallbackMode: string;
  bankIdExample: string;
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
  memoryProvider?: "local" | "hindsight";
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
  updatedAt?: string;
  chunksUsedCount: number;
  memoriesUsedCount: number;
  status: "generated" | "planned" | "patch_generated" | "approved" | "applied" | "pr_created" | "failed";
  plan?: string;
  chunksUsed?: ScoredRagChunk[];
  memoriesUsed?: ScoredMemory[];
  patchPreview: ExecutablePatch[];
  testsToRun?: string[];
  risks?: string[];
  filesTouched?: string[];
  branchName?: string;
  commitSha?: string;
  prUrl?: string;
  error?: string;
  memoryToSave?: MemoryDraft[];
}

export interface ImportedProject extends ProjectBrain {
  owner: string;
  repoName: string;
  defaultBranch: string;
  description: string;
  architecture: string;
  memoryCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRepoMetadata {
  owner: string;
  repoName: string;
  name: string;
  fullName: string;
  description: string;
  repoUrl: string;
  defaultBranch: string;
  language?: string;
}

export interface GitHubTreeFile {
  path: string;
  size: number;
  type: "blob" | "tree" | string;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

export interface RepoAnalysis {
  stack: string[];
  modules: ProjectModule[];
  architecture: string;
  riskAreas: string[];
  importantFiles: string[];
  codingConventions: string[];
}
