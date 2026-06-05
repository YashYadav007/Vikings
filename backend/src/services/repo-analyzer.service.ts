import { GitHubRepoMetadata, ProjectModule, RagChunk, RepoAnalysis, RepoFile } from "../types";

const RISK_KEYWORDS = ["auth", "payment", "checkout", "database", "migration", "security", "env", "token", "password", "webhook"];

export class RepoAnalyzerService {
  analyze(metadata: GitHubRepoMetadata, files: RepoFile[], chunks: RagChunk[]): RepoAnalysis {
    const packageJson = this.parsePackage(files.find((file) => file.path === "package.json")?.content);
    const stack = this.detectStack(metadata, packageJson);
    const modules = this.detectModules(files);
    const riskAreas = this.detectRiskAreas(files);
    const importantFiles = this.detectImportantFiles(files);
    const codingConventions = this.detectCodingConventions(files);

    return {
      stack,
      modules,
      architecture: this.summarizeArchitecture(metadata, stack, modules, chunks),
      riskAreas,
      importantFiles,
      codingConventions,
    };
  }

  summarizeImportedArchitecture(params: {
    metadata: GitHubRepoMetadata;
    stack: string[];
    modules: ProjectModule[];
    chunkCount: number;
    ragProvider: "local" | "pgvector";
    semanticIndex: boolean;
  }): string {
    const moduleNames = params.modules.map((module) => module.name).join(", ") || "root";
    const indexSummary =
      params.ragProvider === "pgvector" && params.semanticIndex
        ? `Indexed ${params.chunkCount} semantic RAG chunks using Supabase pgvector.`
        : `Indexed ${params.chunkCount} local RAG chunks for keyword search.`;

    return `${params.metadata.name} is a public GitHub repository imported from ${params.metadata.fullName}. Detected stack: ${
      params.stack.join(", ") || "unknown"
    }. Main modules: ${moduleNames}. ${indexSummary}`;
  }

  private detectStack(metadata: GitHubRepoMetadata, packageJson: Record<string, unknown> | null): string[] {
    const stack = new Set<string>();
    if (metadata.language) stack.add(metadata.language);

    const deps = {
      ...this.asRecord(packageJson?.dependencies),
      ...this.asRecord(packageJson?.devDependencies),
    };
    const names = Object.keys(deps);

    if (names.includes("next")) stack.add("Next.js");
    if (names.includes("react")) stack.add("React");
    if (names.includes("vue")) stack.add("Vue");
    if (names.includes("vite")) stack.add("Vite");
    if (names.includes("express")) stack.add("Express");
    if (names.includes("typescript")) stack.add("TypeScript");
    if (names.includes("zod")) stack.add("Zod");
    if (names.includes("prisma")) stack.add("Prisma");
    if (names.includes("@prisma/client")) stack.add("Prisma");
    if (names.includes("tailwindcss")) stack.add("Tailwind CSS");

    return [...stack].slice(0, 12);
  }

  private detectModules(files: RepoFile[]): ProjectModule[] {
    const moduleMap = new Map<string, string[]>();

    for (const file of files) {
      const moduleName = this.moduleName(file.path);
      const current = moduleMap.get(moduleName) ?? [];
      current.push(file.path);
      moduleMap.set(moduleName, current);
    }

    return [...moduleMap.entries()].slice(0, 10).map(([name, paths]) => ({
      id: `module-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      summary: `${name} module inferred from repository file paths.`,
      files: paths.slice(0, 8),
    }));
  }

  private detectRiskAreas(files: RepoFile[]): string[] {
    const risks = new Set<string>();

    for (const file of files) {
      const text = `${file.path}\n${file.content.slice(0, 5000)}`.toLowerCase();
      for (const keyword of RISK_KEYWORDS) {
        if (text.includes(keyword)) risks.add(`${this.toTitle(keyword)} sensitive area`);
      }
    }

    return [...risks].slice(0, 10);
  }

  private detectImportantFiles(files: RepoFile[]): string[] {
    const important = files
      .map((file) => file.path)
      .filter((path) =>
        /(^readme\.md$|^package\.json$|config|schema|prisma|auth|checkout|payment|route|api|server|database|migration)/i.test(path),
      );

    return [...new Set(important)].slice(0, 12);
  }

  private detectCodingConventions(files: RepoFile[]): string[] {
    const conventions = new Set<string>();
    if (files.some((file) => file.path.endsWith(".ts") || file.path.endsWith(".tsx"))) conventions.add("TypeScript files are present.");
    if (files.some((file) => file.content.includes("z.object"))) conventions.add("Zod appears to be used for validation.");
    if (files.some((file) => file.path.includes("test") || file.path.includes("spec"))) conventions.add("Test files are part of the repository.");
    return [...conventions];
  }

  private summarizeArchitecture(
    metadata: GitHubRepoMetadata,
    stack: string[],
    modules: ProjectModule[],
    chunks: RagChunk[],
  ): string {
    return this.summarizeImportedArchitecture({
      metadata,
      stack,
      modules,
      chunkCount: chunks.length,
      ragProvider: "local",
      semanticIndex: false,
    });
  }

  private moduleName(path: string): string {
    const parts = path.split("/");
    if (parts[0] === "src" && parts[1]) return this.toTitle(parts[1]);
    return this.toTitle((parts[0] || "root").replace(/\..+$/, ""));
  }

  private parsePackage(content?: string): Record<string, unknown> | null {
    if (!content) return null;
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  }

  private toTitle(value: string): string {
    return value
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
