import { LlmService } from "./llm.service";
import { LocalMemoryService } from "./local-memory.service";
import { LocalRagService } from "./local-rag.service";
import { TaskService } from "./task.service";
import { MemoryPoweredAnswer, ProjectId } from "../types";
import { ProjectService } from "./project.service";

export class AgentService {
  constructor(
    private readonly ragService: LocalRagService,
    private readonly memoryService: LocalMemoryService,
    private readonly llmService: LlmService,
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
  ) {}

  generateGeneric(message: string): Promise<string> {
    return this.llmService.generateGenericAnswer(message);
  }

  async generateMemoryPowered(projectId: ProjectId, message: string): Promise<MemoryPoweredAnswer> {
    const project = await this.projectService.getProject(projectId);
    const ragContext = await this.ragService.searchProjectContext(project, message);
    const chunks = ragContext.chunks;
    const memories = await this.memoryService.recall(projectId, message);
    const answer = await this.llmService.generateMemoryAnswer(message, chunks, memories);
    answer.memoryProvider = this.memoryService.providerName;
    answer.ragProvider = this.ragService.providerName;
    answer.semanticSearch = this.ragService.providerName === "pgvector";
    answer.ragFallbackUsed = ragContext.fallbackUsed;
    this.taskService.recordGeneratedTask(projectId, message, answer);
    return answer;
  }

  async compare(projectId: ProjectId, message: string) {
    const [genericAnswer, memoryAnswer] = await Promise.all([
      this.generateGeneric(message),
      this.generateMemoryPowered(projectId, message),
    ]);

    return {
      genericAnswer,
      memoryAnswer: memoryAnswer.answer,
      chunksUsed: memoryAnswer.chunksUsed,
      memoriesUsed: memoryAnswer.rawMemoriesUsed,
      patchPreview: memoryAnswer.patchPreview,
      memoryToSave: memoryAnswer.memoryToSave,
      memoryProvider: this.memoryService.providerName,
      ragProvider: memoryAnswer.ragProvider,
      semanticSearch: memoryAnswer.semanticSearch,
      ragFallbackUsed: memoryAnswer.ragFallbackUsed,
      canExecute: true,
      executeEndpoint: "/api/agent/execute",
    };
  }
}
