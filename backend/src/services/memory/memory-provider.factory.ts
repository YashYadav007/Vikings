import { MemoryProvider } from "./memory-provider.interface";
import { HindsightMemoryProvider } from "./hindsight-memory.provider";
import { LocalMemoryProvider } from "./local-memory.provider";
import { MemoryProviderStatus } from "../../types";

const DEFAULT_PROJECT_PREFIX = "devcontext";

export function createMemoryProvider(): MemoryProvider {
  const requestedProvider = process.env.MEMORY_PROVIDER ?? "local";
  const fallbackMode = process.env.HINDSIGHT_FALLBACK_MODE ?? "local";
  const localProvider = new LocalMemoryProvider();

  if (requestedProvider === "hindsight") {
    const apiUrl = process.env.HINDSIGHT_API_URL;
    const apiKey = process.env.HINDSIGHT_API_KEY;
    const projectPrefix = process.env.HINDSIGHT_PROJECT_PREFIX ?? DEFAULT_PROJECT_PREFIX;

    if (apiUrl && apiKey) {
      return new HindsightMemoryProvider({
        apiUrl,
        apiKey,
        projectPrefix,
        fallbackProvider: localProvider,
      });
    }

    if (fallbackMode === "local") {
      console.warn(
        "MEMORY_PROVIDER=hindsight requested, but HINDSIGHT_API_URL or HINDSIGHT_API_KEY is missing. Falling back to local memory provider.",
      );
      return localProvider;
    }

    console.warn(
      "MEMORY_PROVIDER=hindsight requested without credentials and local fallback is disabled. Starting local provider to keep backend available.",
    );
    return localProvider;
  }

  return localProvider;
}

export function getMemoryProviderStatus(activeProvider: MemoryProvider["name"]): MemoryProviderStatus {
  const configuredProvider = process.env.MEMORY_PROVIDER ?? "local";
  const fallbackMode = process.env.HINDSIGHT_FALLBACK_MODE ?? "local";
  const projectPrefix = process.env.HINDSIGHT_PROJECT_PREFIX ?? DEFAULT_PROJECT_PREFIX;
  const sessionId = process.env.HINDSIGHT_DEMO_SESSION_ID?.trim();

  return {
    activeProvider,
    configuredProvider,
    hindsightConfigured: Boolean(process.env.HINDSIGHT_API_URL && process.env.HINDSIGHT_API_KEY),
    fallbackMode,
    bankIdExample: sessionId ? `${projectPrefix}:${sessionId}:demo-shopease` : `${projectPrefix}:demo-shopease`,
  };
}
