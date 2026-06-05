import { ExecutablePatch, ScoredMemory, ScoredRagChunk } from "../types";

export interface PatchGenerationResult {
  patchPreview: ExecutablePatch[];
  testsToRun: string[];
  risks: string[];
  filesTouched: string[];
}

export class PatchEngineService {
  generatePatch(message: string, chunks: ScoredRagChunk[], memories: ScoredMemory[]): PatchGenerationResult {
    const targetChunks = this.pickTargetChunks(message, chunks);
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

  private pickTargetChunks(message: string, chunks: ScoredRagChunk[]): ScoredRagChunk[] {
    if (/readme|setup instructions|documentation|docs/i.test(message) && !chunks.some((chunk) => /(^|\/)readme(\.md)?$/i.test(chunk.filePath))) {
      return [
        {
          id: "synthetic-readme",
          projectId: "synthetic",
          filePath: "README.md",
          language: "Markdown",
          module: "README",
          summary: "README documentation describing setup, usage, and project overview.",
          content: "# Project\n\n## Setup\n\n",
          startLine: 1,
          endLine: 5,
          symbols: [],
          source: "github" as const,
          score: 0.02,
        },
        ...chunks,
      ].slice(0, 3);
    }

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
    const isReadme = /(^|\/)readme(\.md)?$/i.test(chunk.filePath);
    const marker = this.commentMarker(chunk.filePath);
    const status = chunk.id === "synthetic-readme" ? "added" : "modified";
    const newContent = isReadme
      ? this.updatedReadmeContent(chunk.content, message)
      : `${chunk.content}\n${marker} DevContext planned change: ${message}\n`;

    return {
      filePath: chunk.filePath,
      status,
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

  private updatedReadmeContent(content: string, message: string): string {
    const base = content.trim().length > 0 ? content.trimEnd() : "# Project\n";
    const setupSection = [
      "",
      "## Setup",
      "",
      "- Install dependencies with the package manager used by this repository.",
      "- Run the documented development command before making changes.",
      "- For browser extension projects, load the unpacked extension from `chrome://extensions` after enabling Developer Mode.",
      "",
      `<!-- DevContext planned change: ${message} -->`,
    ].join("\n");

    if (/^##\s+Setup/im.test(base)) {
      return `${base}\n\n<!-- DevContext note: ${message} -->\n`;
    }

    return `${base}\n${setupSection}\n`;
  }
}
