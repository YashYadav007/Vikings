import { GitHubTreeFile } from "../types";

const MAX_FILE_SIZE_BYTES = 100 * 1024;
const MAX_IMPORT_FILES = 40;

const IGNORE_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);
const IGNORE_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".mp4",
  ".mov",
  ".avi",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".wasm",
]);

const PRIORITY_PREFIXES = [
  "src/",
  "app/",
  "pages/",
  "components/",
  "lib/",
  "api/",
  "routes/",
  "models/",
  "schema/",
  "prisma/",
  "migrations/",
  "tests/",
  "e2e/",
  "specs/",
];

const PRIORITY_FILES = [/^readme(?:\.md)?$/i, /^package\.json$/i, /^tsconfig\.json$/i, /^next\.config\./i, /^vite\.config\./i];

export interface FilteredFilesResult {
  files: GitHubTreeFile[];
  warnings: string[];
}

export class FileFilterService {
  filter(files: GitHubTreeFile[]): FilteredFilesResult {
    const warnings: string[] = [];
    const usefulFiles = files
      .filter((file) => this.isUsefulFile(file))
      .sort((a, b) => this.priorityScore(b.path) - this.priorityScore(a.path) || a.path.localeCompare(b.path));

    if (usefulFiles.length > MAX_IMPORT_FILES) {
      warnings.push(`Import limited to top ${MAX_IMPORT_FILES} useful files out of ${usefulFiles.length} eligible files.`);
    }

    return {
      files: usefulFiles.slice(0, MAX_IMPORT_FILES),
      warnings,
    };
  }

  private isUsefulFile(file: GitHubTreeFile): boolean {
    const path = file.path;
    const lowerPath = path.toLowerCase();
    const parts = lowerPath.split("/");
    const fileName = parts[parts.length - 1];

    if (file.size > MAX_FILE_SIZE_BYTES) return false;
    if (parts.some((part) => IGNORE_DIRS.has(part))) return false;
    if (IGNORE_FILES.has(fileName)) return false;
    if (lowerPath.includes(".min.")) return false;
    if ([...BINARY_EXTENSIONS].some((extension) => lowerPath.endsWith(extension))) return false;

    return this.priorityScore(path) > 0 || this.looksLikeSourceFile(lowerPath);
  }

  private priorityScore(path: string): number {
    const lowerPath = path.toLowerCase();
    let score = 0;

    if (PRIORITY_FILES.some((pattern) => pattern.test(lowerPath))) score += 100;
    if (PRIORITY_PREFIXES.some((prefix) => lowerPath.startsWith(prefix))) score += 60;
    if (lowerPath.includes("/src/") || lowerPath.includes("/lib/") || lowerPath.includes("/app/")) score += 40;
    if (this.looksLikeSourceFile(lowerPath)) score += 10;

    return score;
  }

  private looksLikeSourceFile(path: string): boolean {
    return /(^readme$|\.(ts|tsx|js|jsx|mjs|cjs|json|md|py|go|rs|java|rb|php|cs|css|scss|sql|prisma|yml|yaml)$)/.test(path);
  }
}
