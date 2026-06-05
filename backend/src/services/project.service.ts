import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seedProject } from "../data/seed-project";
import { ImportedProject, ProjectBrain, ProjectId } from "../types";
import { LocalMemoryService } from "./local-memory.service";
import { LocalRagService } from "./local-rag.service";

export class ProjectService {
  private readonly storagePath: string;

  constructor(
    private readonly ragService: LocalRagService,
    private readonly memoryService: LocalMemoryService,
    storagePath = resolve(process.cwd(), ".data", "projects.json"),
  ) {
    this.storagePath = storagePath;
    this.ensureStorageFile();
  }

  async listProjects(): Promise<ProjectBrain[]> {
    const seed = await this.getProject("demo-shopease");
    const imported = await Promise.all(this.readImportedProjects().map((project) => this.getProject(project.id)));
    return [seed, ...imported];
  }

  async getProject(projectId: ProjectId): Promise<ProjectBrain> {
    if (projectId === "demo-shopease") {
      return {
        ...seedProject,
        memoryCount: await this.memoryService.count(projectId),
        chunkCount: await this.ragService.count(projectId),
      };
    }

    const project = this.readImportedProjects().find((candidate) => candidate.id === projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return {
      ...project,
      memoryCount: await this.memoryService.count(projectId),
      chunkCount: await this.ragService.count(projectId),
    };
  }

  saveImportedProject(project: ImportedProject): ImportedProject {
    const existingProject = this.readImportedProjects().find((candidate) => candidate.id === project.id);
    const projects = this.readImportedProjects().filter((candidate) => candidate.id !== project.id);
    const now = new Date().toISOString();
    const nextProject = {
      ...project,
      updatedAt: now,
      createdAt: existingProject?.createdAt || project.createdAt || now,
    };

    projects.push(nextProject);
    this.writeImportedProjects(projects);
    return nextProject;
  }

  createProjectId(owner: string, repoName: string): string {
    return `github-${owner}-${repoName}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  }

  importedProjectExists(projectId: ProjectId): boolean {
    return this.readImportedProjects().some((project) => project.id === projectId);
  }

  deleteImportedProject(projectId: ProjectId): boolean {
    const projects = this.readImportedProjects();
    const nextProjects = projects.filter((project) => project.id !== projectId);
    this.writeImportedProjects(nextProjects);
    return projects.length !== nextProjects.length;
  }

  clearImportedProjects(): number {
    const projects = this.readImportedProjects();
    this.writeImportedProjects([]);
    return projects.length;
  }

  private ensureStorageFile(): void {
    const directory = dirname(this.storagePath);
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
    if (!existsSync(this.storagePath)) writeFileSync(this.storagePath, "[]\n", "utf8");
  }

  private readImportedProjects(): ImportedProject[] {
    this.ensureStorageFile();
    try {
      const parsed = JSON.parse(readFileSync(this.storagePath, "utf8")) as ImportedProject[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeImportedProjects(projects: ImportedProject[]): void {
    this.ensureStorageFile();
    writeFileSync(this.storagePath, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  }
}
