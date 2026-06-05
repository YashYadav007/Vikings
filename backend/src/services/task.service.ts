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
      chunksUsedCount: answer.chunksUsed.length,
      memoriesUsedCount: answer.rawMemoriesUsed.length,
      patchPreview: answer.patchPreview,
      status: "generated",
    };

    const tasks = this.readTasks();
    tasks.push(task);
    this.writeTasks(tasks);

    return task;
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
