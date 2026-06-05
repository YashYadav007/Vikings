import cors from "cors";
import dotenv from "dotenv";
import express, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { createChatRouter } from "./routes/chat.routes";
import { createDevRouter } from "./routes/dev.routes";
import { createAgentRouter } from "./routes/agent.routes";
import { createGraphRouter } from "./routes/graph.routes";
import { createMemoryRouter } from "./routes/memory.routes";
import { createPatchesRouter } from "./routes/patches.routes";
import { createProjectsRouter } from "./routes/projects.routes";
import { createRagRouter } from "./routes/rag.routes";
import { createReposRouter } from "./routes/repos.routes";
import { createSystemRouter } from "./routes/system.routes";
import { createTasksRouter } from "./routes/tasks.routes";
import { AgentService } from "./services/agent.service";
import { AgentExecutionService } from "./services/agent-execution.service";
import { ChunkingService } from "./services/chunking.service";
import { FileFilterService } from "./services/file-filter.service";
import { GitHubService } from "./services/github.service";
import { GraphService } from "./services/graph.service";
import { LlmService } from "./services/llm.service";
import { LocalMemoryService } from "./services/local-memory.service";
import { LocalRagService } from "./services/local-rag.service";
import { createMemoryProvider } from "./services/memory/memory-provider.factory";
import { GitHubWriteService } from "./services/github-write.service";
import { PatchEngineService } from "./services/patch-engine.service";
import { ProjectService } from "./services/project.service";
import { RepoAnalyzerService } from "./services/repo-analyzer.service";
import { TaskService } from "./services/task.service";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

const ragService = new LocalRagService();
const memoryService = new LocalMemoryService(createMemoryProvider());
const llmService = new LlmService();
const graphService = new GraphService();
const taskService = new TaskService();
const projectService = new ProjectService(ragService, memoryService);
const githubService = new GitHubService();
const fileFilterService = new FileFilterService();
const chunkingService = new ChunkingService();
const repoAnalyzerService = new RepoAnalyzerService();
const agentService = new AgentService(ragService, memoryService, llmService, taskService);
const patchEngineService = new PatchEngineService();
const githubWriteService = new GitHubWriteService();
const agentExecutionService = new AgentExecutionService(
  ragService,
  memoryService,
  taskService,
  projectService,
  patchEngineService,
  githubWriteService,
);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "devcontext-os-backend",
  });
});

app.use("/api/projects", createProjectsRouter(projectService, ragService, memoryService, graphService, taskService));
app.use("/api/rag", createRagRouter(ragService));
app.use("/api/memory", createMemoryRouter(memoryService));
app.use("/api/chat", createChatRouter(agentService));
app.use("/api/agent", createAgentRouter(agentExecutionService));
app.use("/api/patches", createPatchesRouter(agentExecutionService));
app.use("/api/graph", createGraphRouter(graphService, projectService, ragService, memoryService, taskService));
app.use("/api/tasks", createTasksRouter(taskService));
app.use("/api/dev", createDevRouter(projectService, ragService, memoryService, taskService));
app.use("/api/system", createSystemRouter(memoryService, ragService, llmService, githubWriteService));
app.use(
  "/api/repos",
  createReposRouter(
    githubService,
    fileFilterService,
    chunkingService,
    repoAnalyzerService,
    projectService,
    ragService,
    memoryService,
  ),
);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Validation error", issues: error.flatten() });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`DevContext OS backend listening on http://localhost:${port}`);
});
