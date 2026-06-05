import { ExecutablePatch, ScoredMemory, ScoredRagChunk } from "../types";

export interface PatchGenerationResult {
  patchPreview: ExecutablePatch[];
  testsToRun: string[];
  risks: string[];
  filesTouched: string[];
}

export class PatchEngineService {
  generatePatch(message: string, chunks: ScoredRagChunk[], memories: ScoredMemory[]): PatchGenerationResult {
    const targetChunks = this.pickTargetChunks(chunks);
    const patchPreview = targetChunks.map((chunk) => this.patchForChunk(message, chunk));
    const filesTouched = patchPreview.map((patch) => patch.filePath);
    const memoryRisks = memories.filter((memory) => memory.type === "risk").map((memory) => memory.content);

    return {
      patchPreview,
      testsToRun: this.testsForChunks(targetChunks),
      risks: [...memoryRisks, "Patch is generated from local RAG context and must be reviewed before approval."],
      filesTouched,
    };
  }

  private pickTargetChunks(chunks: ScoredRagChunk[]): ScoredRagChunk[] {
    const byPath = new Map<string, ScoredRagChunk>();

    for (const chunk of chunks) {
      if (!byPath.has(chunk.filePath)) {
        byPath.set(chunk.filePath, chunk);
      }
      if (byPath.size >= 3) break;
    }

    return [...byPath.values()];
  }

  private patchForChunk(message: string, chunk: ScoredRagChunk): ExecutablePatch {
    const originalSnippet = chunk.content.slice(0, 1200);
    const marker = this.commentMarker(chunk.filePath);
    const newContent = `${chunk.content}\n${marker} DevContext planned change: ${message}\n`;

    return {
      filePath: chunk.filePath,
      originalContentSnippet: originalSnippet,
      newContent,
      changeSummary: `Apply requested task context to ${chunk.filePath}.`,
      diff: [
        `--- ${chunk.filePath}`,
        `+++ ${chunk.filePath}`,
        `@@ DevContext preview @@`,
        `${originalSnippet.split("\n").slice(0, 6).join("\n")}`,
        `+${marker} DevContext planned change: ${message}`,
      ].join("\n"),
      risk: "Generated as a conservative preview. Confirm full-file replacement is appropriate before applying.",
    };
  }

  private testsForChunks(chunks: ScoredRagChunk[]): string[] {
    const hasPackage = chunks.some((chunk) => chunk.filePath === "package.json");
    const hasTs = chunks.some((chunk) => chunk.language?.toLowerCase().includes("typescript"));

    return [
      hasPackage ? "npm test if configured in package.json" : "project test command if available",
      hasTs ? "npm run build or TypeScript check if configured" : "run targeted checks around changed files",
    ];
  }

  private commentMarker(filePath: string): string {
    if (/\.(md|txt)$/i.test(filePath)) return "<!--";
    if (/\.(css|scss)$/i.test(filePath)) return "/*";
    if (/\.(py|rb)$/i.test(filePath)) return "#";
    return "//";
  }
}
