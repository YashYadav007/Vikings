import { ChangedFile, RagChunk } from "../../types";

const MAX_LINES = 80;
const OVERLAP_LINES = 10;

export function chunkChangedFile(projectId: string, file: ChangedFile): RagChunk[] {
  if (!file.content) return [];

  const lines = file.content.split(/\r?\n/);
  const chunks: RagChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < lines.length) {
    const end = Math.min(start + MAX_LINES, lines.length);
    const startLine = start + 1;
    const endLine = end;
    const content = lines.slice(start, end).join("\n");

    chunks.push({
      id: `${projectId}:${file.filePath}:${startLine}-${endLine}`,
      projectId,
      filePath: file.filePath,
      language: file.language ?? detectLanguage(file.filePath),
      module: detectModule(file.filePath),
      summary: summarize(file.filePath),
      content,
      startLine,
      endLine,
      symbols: extractSymbols(content),
      source: "github",
    });

    index += 1;
    if (end >= lines.length) break;
    start = Math.max(index * (MAX_LINES - OVERLAP_LINES), end - OVERLAP_LINES);
  }

  return chunks;
}

function detectLanguage(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript React",
    js: "JavaScript",
    jsx: "JavaScript React",
    json: "JSON",
    md: "Markdown",
    py: "Python",
    css: "CSS",
    sql: "SQL",
    yml: "YAML",
    yaml: "YAML",
  };
  return extension ? map[extension] ?? extension : "text";
}

function detectModule(path: string): string {
  const [first, second] = path.split("/");
  if (first === "src" && second) return toTitle(second);
  if (first) return toTitle(first.replace(/\..+$/, ""));
  return "Root";
}

function summarize(path: string): string {
  const lowerPath = path.toLowerCase();
  if (/(^|\/)readme(\.md)?$/i.test(path)) return "README documentation describing setup, usage, and project overview.";
  if (lowerPath.endsWith("package.json")) return "Package manifest describing scripts, dependencies, and JavaScript stack.";
  if (lowerPath.includes("config")) return "Configuration file that may affect build or runtime behavior.";
  return `${detectModule(path)} ${detectLanguage(path)} source file from ${path}.`;
}

function extractSymbols(content: string): string[] {
  const symbols = new Set<string>();
  const patterns = [
    /\bexport\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
    /\bfunction\s+([A-Za-z0-9_]+)/g,
    /\bclass\s+([A-Za-z0-9_]+)/g,
    /\binterface\s+([A-Za-z0-9_]+)/g,
    /\btype\s+([A-Za-z0-9_]+)/g,
    /\bconst\s+([A-Za-z0-9_]+)\s*=/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) symbols.add(match[1]);
    }
  }
  return [...symbols].slice(0, 20);
}

function toTitle(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
