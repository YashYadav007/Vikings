import { Memory, MemoryDraft, ProjectBrain, ScoredMemory, ScoredRagChunk } from "../../types";

export interface LearningSummary {
  projectId: string;
  provider: "local" | "hindsight";
  memoryCount: number;
  recentTasks: Memory[];
  decisions: Memory[];
  risks: Memory[];
  preferences: Memory[];
  followUps: Memory[];
  topFilesMentioned: Array<{ filePath: string; count: number }>;
}

export interface CodingAgentPatchPreviewItem {
  filePath: string;
  status: "added" | "modified" | "deleted";
  changeSummary: string;
  originalContentSnippet: string;
  diff: string;
  newContent: string;
  risk: string;
}

export interface CodingAgentTaskInput {
  projectId: string;
  project: ProjectBrain;
  message: string;
  mode: "safe-auto" | "preview-only";
  ragContext: ScoredRagChunk[];
  hindsightMemories: ScoredMemory[];
  learningSummary?: LearningSummary;
  allowedFiles?: string[];
  maxFiles?: number;
}

export interface CodingAgentTaskResult {
  plan: string;
  memoryInfluence: string;
  filesToEdit: string[];
  patchPreview: CodingAgentPatchPreviewItem[];
  testsToRun: string[];
  risks: string[];
  suggestedMemories: MemoryDraft[];
  confidence: number;
  requiresApproval: boolean;
}

export interface CodingAgentProvider {
  readonly name: "gemini" | "openai" | "llm" | "ollama" | "mock" | "claude-code";
  runTask(input: CodingAgentTaskInput): Promise<CodingAgentTaskResult>;
}
