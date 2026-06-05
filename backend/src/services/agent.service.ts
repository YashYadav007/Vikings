import { LlmService } from "./llm.service";
import { LocalMemoryService } from "./local-memory.service";
import { LocalRagService } from "./local-rag.service";
import { TaskService } from "./task.service";
import { MemoryPoweredAnswer, ProjectId } from "../types";

export class AgentService {
  constructor(
    private readonly ragService: LocalRagService,
    private readonly memoryService: LocalMemoryService,
    private readonly llmService: LlmService,
    private readonly taskService: TaskService,
  ) {}

  generateGeneric(message: string): Promise<string> {
    return this.llmService.generateGenericAnswer(message);
  }

  async generateMemoryPowered(projectId: ProjectId, message: string): Promise<MemoryPoweredAnswer> {
    const chunks = this.ragService.search(projectId, message);
    const memories = await this.memoryService.recall(projectId, message);
    const answer = await this.llmService.generateMemoryAnswer(message, chunks, memories);
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
    };
  }
}
