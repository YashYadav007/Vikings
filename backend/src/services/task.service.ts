import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { GeneratedTask, MemoryPoweredAnswer, ProjectId } from "../types";

export class TaskService {
  private readonly storagePath: string;

  constructor(storagePath = resolve(process.cwd(), ".data", "tasks.json")) {
    this.storagePath = storagePath;
    this.ensureStorageFile();
  }

  list(projectId: ProjectId): GeneratedTask[] {
    return this.readTasks()
      .filter((task) => task.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  recordGeneratedTask(projectId: ProjectId, message: string, answer: MemoryPoweredAnswer): GeneratedTask {
    const task: GeneratedTask = {
      id: `task-${randomUUID()}`,
      projectId,
      message,
      taskType: answer.taskType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chunksUsedCount: answer.chunksUsed.length,
      memoriesUsedCount: answer.rawMemoriesUsed.length,
      patchPreview: answer.patchPreview.map((patch) => ({
        ...patch,
        originalContentSnippet: "",
        newContent: "",
        risk: "Review generated patch before applying.",
      })),
      status: "generated",
    };

    const tasks = this.readTasks();
    tasks.push(task);
    this.writeTasks(tasks);

    return task;
  }

  createTask(task: Omit<GeneratedTask, "id" | "createdAt" | "updatedAt">): GeneratedTask {
    const now = new Date().toISOString();
    const nextTask: GeneratedTask = {
      ...task,
      id: `task-${randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    };
    const tasks = this.readTasks();
    tasks.push(nextTask);
    this.writeTasks(tasks);
    return nextTask;
  }

  getTask(projectId: ProjectId, taskId: string): GeneratedTask | null {
    return this.readTasks().find((task) => task.projectId === projectId && task.id === taskId) ?? null;
  }

  updateTask(projectId: ProjectId, taskId: string, patch: Partial<GeneratedTask>): GeneratedTask | null {
    const tasks = this.readTasks();
    const index = tasks.findIndex((task) => task.projectId === projectId && task.id === taskId);
    if (index === -1) return null;

    const updatedTask = {
      ...tasks[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updatedTask;
    this.writeTasks(tasks);
    return updatedTask;
  }

  clearProject(projectId: ProjectId): number {
    const before = this.readTasks();
    const after = before.filter((task) => task.projectId !== projectId);
    this.writeTasks(after);
    return before.length - after.length;
  }

  clearAll(): number {
    const before = this.readTasks();
    this.writeTasks([]);
    return before.length;
  }

  private ensureStorageFile(): void {
    const directory = dirname(this.storagePath);

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    if (!existsSync(this.storagePath)) {
      writeFileSync(this.storagePath, "[]\n", "utf8");
    }
  }

  private readTasks(): GeneratedTask[] {
    this.ensureStorageFile();

    try {
      const content = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(content) as GeneratedTask[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeTasks(tasks: GeneratedTask[]): void {
    this.ensureStorageFile();
    writeFileSync(this.storagePath, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
  }
}
