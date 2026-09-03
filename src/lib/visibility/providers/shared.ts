import type { ProviderCitation } from "../types";

export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  options: { attempts?: number; timeoutMs?: number; retryDelayMs?: number } = {},
) {
  const attempts = Math.max(1, Math.min(options.attempts ?? 2, 3));
  const timeoutMs = options.timeoutMs ?? 60_000;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok || (response.status !== 429 && response.status < 500) || attempt === attempts) return response;
      lastError = new Error(`Respuesta temporal ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, (options.retryDelayMs ?? 250) * attempt));
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo contactar con el proveedor.");
}

export function collectUrlCitations(value: unknown): ProviderCitation[] {
  const found = new Map<string, ProviderCitation>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const record = node as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : typeof record.uri === "string" ? record.uri : null;
    if (url?.startsWith("http")) {
      found.set(url, {
        url,
        title: typeof record.title === "string" ? record.title : undefined,
        snippet: typeof record.snippet === "string" ? record.snippet : undefined,
      });
    }
    Object.values(record).forEach(visit);
  };
  visit(value);
  return [...found.values()];
}

export function providerFailure(
  provider: "openai" | "gemini" | "perplexity",
  model: string | null,
  startedAt: number,
  error: unknown,
) {
  return {
    provider,
    status: "failed" as const,
    model,
    modelVersion: null,
    text: null,
    citations: [],
    durationMs: Date.now() - startedAt,
    inputTokens: null,
    outputTokens: null,
    error: error instanceof Error ? error.message.slice(0, 500) : "Error desconocido del proveedor.",
    metadata: {},
  };
}
