import { MemoryProvider } from "./memory-provider.interface";
import { HindsightMemoryProvider } from "./hindsight-memory.provider";
import { LocalMemoryProvider } from "./local-memory.provider";

export function createMemoryProvider(): MemoryProvider {
  const requestedProvider = process.env.MEMORY_PROVIDER ?? "local";
  const fallbackMode = process.env.HINDSIGHT_FALLBACK_MODE ?? "local";

  if (requestedProvider === "hindsight") {
    const apiUrl = process.env.HINDSIGHT_API_URL;
    const apiKey = process.env.HINDSIGHT_API_KEY;

    if (apiUrl && apiKey) {
      console.warn(
        "MEMORY_PROVIDER=hindsight is configured, but real Hindsight calls are scaffolded only. Falling back to local provider until integration is implemented.",
      );
      return new LocalMemoryProvider();
      // Future switch:
      // return new HindsightMemoryProvider({ apiUrl, apiKey });
    }

    if (fallbackMode === "local") {
      console.warn(
        "MEMORY_PROVIDER=hindsight requested, but HINDSIGHT_API_URL or HINDSIGHT_API_KEY is missing. Falling back to local memory provider.",
      );
      return new LocalMemoryProvider();
    }

    return new HindsightMemoryProvider({ apiUrl, apiKey });
  }

  return new LocalMemoryProvider();
}
