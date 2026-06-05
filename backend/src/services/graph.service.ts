import { GeneratedTask, Memory, ProjectBrain, ProjectGraph, ProjectModule, RagChunk } from "../types";

export class GraphService {
  getProjectGraph(project: ProjectBrain, memories: Memory[], tasks: GeneratedTask[], chunks: RagChunk[]): ProjectGraph {
    const nodes: ProjectGraph["nodes"] = [];
    const edges: ProjectGraph["edges"] = [];
    const projectNodeId = `project-${project.id}`;

    nodes.push({
      id: projectNodeId,
      type: "project",
      data: { label: project.name, count: 1 },
      position: { x: 400, y: 0 },
    });

    const modules = this.dedupeModules(project.modules);
    const fileNodeIds = new Map<string, string>();

    modules.forEach((module, index) => {
      const moduleId = module.id || `module-${this.slug(module.name)}`;
      nodes.push({
        id: moduleId,
        type: "module",
        data: { label: module.name, summary: module.summary, count: 1 },
        position: { x: 80 + index * 240, y: 160 },
      });
      edges.push({ id: `edge-${projectNodeId}-${moduleId}`, source: projectNodeId, target: moduleId, label: "has module" });

      const moduleFiles = module.files.length > 0 ? module.files : chunks.filter((chunk) => chunk.module === module.name).map((chunk) => chunk.filePath);
      [...new Set(moduleFiles)].slice(0, 5).forEach((filePath, fileIndex) => {
        if (fileNodeIds.has(filePath)) {
          edges.push({
            id: `edge-${moduleId}-${fileNodeIds.get(filePath)}`,
            source: moduleId,
            target: fileNodeIds.get(filePath) as string,
            label: "owns file",
          });
          return;
        }

        const fileId = `file-${this.slug(filePath)}`;
        fileNodeIds.set(filePath, fileId);
        nodes.push({
          id: fileId,
          type: "file",
          data: { label: filePath, count: 1 },
          position: { x: 60 + index * 240, y: 320 + fileIndex * 70 },
        });
        edges.push({ id: `edge-${moduleId}-${fileId}`, source: moduleId, target: fileId, label: "owns file" });
      });
    });

    this.groupMemories(memories)
      .slice(0, 8)
      .forEach((group, index) => {
        const memoryId = `memory-${this.slug(group.key)}`;
        const memory = group.memory;
        const relatedModule = modules.find((module) => memory.relatedFiles.some((file) => module.files.includes(file))) ?? modules[0];
        nodes.push({
          id: memoryId,
          type: "memory",
          data: {
            label: `${this.toTitle(memory.type)}: ${memory.title}${group.count > 1 ? ` × ${group.count}` : ""}`,
            count: group.count,
          },
          position: { x: 80 + (index % 4) * 240, y: 560 + Math.floor(index / 4) * 100 },
        });
        if (relatedModule) {
          edges.push({
            id: `edge-${relatedModule.id}-${memoryId}`,
            source: relatedModule.id,
            target: memoryId,
            label: "has memory",
          });
        }
      });

    this.groupTasks(tasks)
      .slice(-5)
      .forEach((group, index) => {
        const taskId = `task-${this.slug(group.key)}`;
        nodes.push({
          id: taskId,
          type: "task",
          data: {
            label: `${group.message}${group.count > 1 ? ` × ${group.count}` : ""}`,
            count: group.count,
            status: group.status,
          },
          position: { x: 120 + index * 220, y: 780 },
        });
        edges.push({ id: `edge-${projectNodeId}-${taskId}`, source: projectNodeId, target: taskId, label: "generated task" });

        for (const filePath of group.filesTouched.slice(0, 3)) {
          let fileId = fileNodeIds.get(filePath);
          if (!fileId) {
            fileId = `file-${this.slug(filePath)}`;
            fileNodeIds.set(filePath, fileId);
            nodes.push({
              id: fileId,
              type: "file",
              data: { label: filePath, count: 1 },
              position: { x: 120 + index * 220, y: 880 },
            });
          }
          edges.push({ id: `edge-${taskId}-${fileId}`, source: taskId, target: fileId, label: "touches file" });

          if (group.incrementalRagUpdate && group.incrementalRagUpdate.chunksInserted > 0) {
            const ragUpdateId = `rag-update-${this.slug(group.key)}-${this.slug(filePath)}`;
            nodes.push({
              id: ragUpdateId,
              type: "rag-update",
              data: {
                label: `RAG updated: ${group.incrementalRagUpdate.chunksInserted} chunk(s)`,
                provider: group.incrementalRagUpdate.provider,
                semanticIndex: group.incrementalRagUpdate.semanticIndex,
                count: 1,
              },
              position: { x: 120 + index * 220, y: 1000 },
            });
            edges.push({ id: `edge-${fileId}-${ragUpdateId}`, source: fileId, target: ragUpdateId, label: "RAG updated" });
          }
        }

        if (group.prUrl) {
          const prId = `pr-${this.slug(group.prUrl)}`;
          nodes.push({
            id: prId,
            type: "pr",
            data: { label: "Pull Request", url: group.prUrl, count: 1 },
            position: { x: 120 + index * 220, y: 900 },
          });
          edges.push({ id: `edge-${taskId}-${prId}`, source: taskId, target: prId, label: "opened PR" });
        }

        const taskMemory = memories.find((memory) => memory.type === "task" && this.normalize(memory.title) === this.normalize(group.message));
        if (taskMemory) {
          const memoryId = `memory-${this.slug(`${taskMemory.type}|${this.normalize(taskMemory.title)}`)}`;
          edges.push({ id: `edge-${taskId}-${memoryId}`, source: taskId, target: memoryId, label: "retained memory" });
        }
      });

    [...new Set(project.riskAreas)].slice(0, 6).forEach((risk, index) => {
      const riskId = `risk-${this.slug(risk)}`;
      nodes.push({
        id: riskId,
        type: "risk",
        data: { label: risk, count: 1 },
        position: { x: 120 + index * 220, y: 940 },
      });
      edges.push({ id: `edge-${projectNodeId}-${riskId}`, source: projectNodeId, target: riskId, label: "has risk" });
    });

    return { nodes, edges: this.dedupeEdges(edges) };
  }

  private dedupeModules(modules: ProjectModule[]): ProjectModule[] {
    const byKey = new Map<string, ProjectModule>();

    for (const module of modules) {
      const key = module.id || this.slug(module.name);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...module, files: [...new Set(module.files)] });
        continue;
      }
      existing.files = [...new Set([...existing.files, ...module.files])];
    }

    return [...byKey.values()];
  }

  private groupMemories(memories: Memory[]): Array<{ key: string; memory: Memory; count: number }> {
    const groups = new Map<string, { key: string; memory: Memory; count: number }>();

    for (const memory of memories) {
      const key = `${memory.type}|${this.normalize(memory.title)}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, { key, memory, count: 1 });
      }
    }

    return [...groups.values()];
  }

  private groupTasks(tasks: GeneratedTask[]): Array<{
    key: string;
    message: string;
    count: number;
    status: string;
    filesTouched: string[];
    prUrl?: string;
    incrementalRagUpdate?: GeneratedTask["incrementalRagUpdate"];
  }> {
    const groups = new Map<
      string,
      {
        key: string;
        message: string;
        count: number;
        status: string;
        filesTouched: string[];
        prUrl?: string;
        incrementalRagUpdate?: GeneratedTask["incrementalRagUpdate"];
      }
    >();

    for (const task of tasks) {
      const key = `${task.taskType}|${this.normalize(task.message)}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        existing.status = task.status;
        existing.filesTouched = [...new Set([...existing.filesTouched, ...(task.filesTouched ?? [])])];
        existing.prUrl = task.prUrl ?? existing.prUrl;
        existing.incrementalRagUpdate = task.incrementalRagUpdate ?? existing.incrementalRagUpdate;
      } else {
        groups.set(key, {
          key,
          message: task.message,
          count: 1,
          status: task.status,
          filesTouched: task.filesTouched ?? [],
          prUrl: task.prUrl,
          incrementalRagUpdate: task.incrementalRagUpdate,
        });
      }
    }

    return [...groups.values()];
  }

  private dedupeEdges(edges: ProjectGraph["edges"]): ProjectGraph["edges"] {
    const seen = new Set<string>();
    return edges.filter((edge) => {
      const key = `${edge.source}|${edge.target}|${edge.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  private toTitle(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }
}
