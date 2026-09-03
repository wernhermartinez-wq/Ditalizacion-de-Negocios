import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiVisibilityProvider } from "./gemini";
import { openAIVisibilityProvider } from "./openai";
import { perplexityVisibilityProvider } from "./perplexity";
import { fetchWithRetry } from "./shared";

const saved = { openai: process.env.OPENAI_API_KEY, gemini: process.env.GEMINI_API_KEY, perplexity: process.env.PERPLEXITY_API_KEY };
afterEach(() => {
  vi.unstubAllGlobals();
  if (saved.openai) process.env.OPENAI_API_KEY = saved.openai; else delete process.env.OPENAI_API_KEY;
  if (saved.gemini) process.env.GEMINI_API_KEY = saved.gemini; else delete process.env.GEMINI_API_KEY;
  if (saved.perplexity) process.env.PERPLEXITY_API_KEY = saved.perplexity; else delete process.env.PERPLEXITY_API_KEY;
});

describe("provider adapters", () => {
  it.each([openAIVisibilityProvider, geminiVisibilityProvider, perplexityVisibilityProvider])("%s queda operativa sin clave", async (provider) => {
    delete process.env.OPENAI_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.PERPLEXITY_API_KEY;
    const result = await provider.execute({ prompt: "¿Qué empresa recomiendas?", country: "ES", language: "es" });
    expect(result.status).toBe("not_configured");
    expect(result.error).toBe("No configurada");
  });

  it("reintenta una respuesta temporal una sola vez y conserva la respuesta válida", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response("temporal", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    const result = await fetchWithRetry("https://provider.invalid", {}, { attempts: 2, retryDelayMs: 0 });
    expect(result.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
