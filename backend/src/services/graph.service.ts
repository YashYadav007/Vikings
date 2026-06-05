import { GeneratedTask, Memory, ProjectBrain, ProjectGraph, RagChunk } from "../types";

export class GraphService {
  getProjectGraph(project: ProjectBrain, memories: Memory[], tasks: GeneratedTask[], chunks: RagChunk[]): ProjectGraph {
    const nodes: ProjectGraph["nodes"] = [];
    const edges: ProjectGraph["edges"] = [];
    const projectNodeId = `project-${project.id}`;

    nodes.push({
      id: projectNodeId,
      type: "project",
      data: { label: project.name },
      position: { x: 400, y: 0 },
    });

    project.modules.forEach((module, index) => {
      const moduleId = module.id || `module-${this.slug(module.name)}`;
      nodes.push({
        id: moduleId,
        type: "module",
        data: { label: module.name, summary: module.summary },
        position: { x: 80 + index * 240, y: 160 },
      });
      edges.push({ id: `edge-${projectNodeId}-${moduleId}`, source: projectNodeId, target: moduleId, label: "has module" });

      const moduleFiles = module.files.length > 0 ? module.files : chunks.filter((chunk) => chunk.module === module.name).map((chunk) => chunk.filePath);
      [...new Set(moduleFiles)].slice(0, 5).forEach((filePath, fileIndex) => {
        const fileId = `file-${this.slug(`${module.name}-${filePath}`)}`;
        nodes.push({
          id: fileId,
          type: "file",
          data: { label: filePath },
          position: { x: 60 + index * 240, y: 320 + fileIndex * 70 },
        });
        edges.push({ id: `edge-${moduleId}-${fileId}`, source: moduleId, target: fileId, label: "owns file" });
      });
    });

    memories.slice(0, 8).forEach((memory, index) => {
      const memoryId = `memory-${this.slug(memory.id)}`;
      const relatedModule = project.modules.find((module) => memory.relatedFiles.some((file) => module.files.includes(file))) ?? project.modules[0];
      nodes.push({
        id: memoryId,
        type: "memory",
        data: { label: `${this.toTitle(memory.type)}: ${memory.title}` },
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

    tasks.slice(-5).forEach((task, index) => {
      const taskId = `task-${this.slug(task.id)}`;
      nodes.push({
        id: taskId,
        type: "task",
        data: { label: task.message },
        position: { x: 120 + index * 220, y: 780 },
      });
      edges.push({ id: `edge-${projectNodeId}-${taskId}`, source: projectNodeId, target: taskId, label: "generated task" });
    });

    project.riskAreas.slice(0, 6).forEach((risk, index) => {
      const riskId = `risk-${this.slug(risk)}`;
      nodes.push({
        id: riskId,
        type: "risk",
        data: { label: risk },
        position: { x: 120 + index * 220, y: 940 },
      });
      edges.push({ id: `edge-${projectNodeId}-${riskId}`, source: projectNodeId, target: riskId, label: "has risk" });
    });

    return { nodes, edges };
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  private toTitle(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
