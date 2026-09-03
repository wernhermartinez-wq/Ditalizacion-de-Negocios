import type { ProviderInput, VisibilityProviderAdapter } from "../types";
import { collectUrlCitations, fetchWithRetry, providerFailure } from "./shared";

export const geminiVisibilityProvider: VisibilityProviderAdapter = {
  name: "gemini",
  configured: () => Boolean(process.env.GEMINI_API_KEY),
  async execute(input: ProviderInput) {
    const startedAt = Date.now();
    const model = process.env.GEMINI_VISIBILITY_MODEL ?? "gemini-2.5-flash";
    if (!process.env.GEMINI_API_KEY) return { ...providerFailure("gemini", model, startedAt, "No configurada"), status: "not_configured" as const, error: "No configurada" };
    try {
      const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: input.prompt }] }], tools: [{ google_search: {} }] }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(`Gemini ${response.status}: ${JSON.stringify(payload).slice(0, 350)}`);
      const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
      const first = candidates[0] && typeof candidates[0] === "object" ? candidates[0] as Record<string, unknown> : {};
      const content = first.content && typeof first.content === "object" ? first.content as Record<string, unknown> : {};
      const parts = Array.isArray(content.parts) ? content.parts : [];
      const text = parts.map((part) => part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? String((part as Record<string, unknown>).text) : "").filter(Boolean).join("\n");
      const usage = payload.usageMetadata && typeof payload.usageMetadata === "object" ? payload.usageMetadata as Record<string, unknown> : {};
      return {
        provider: "gemini" as const, status: "completed" as const, model, modelVersion: typeof payload.modelVersion === "string" ? payload.modelVersion : model,
        text, citations: collectUrlCitations(first.groundingMetadata), durationMs: Date.now() - startedAt,
        inputTokens: typeof usage.promptTokenCount === "number" ? usage.promptTokenCount : null,
        outputTokens: typeof usage.candidatesTokenCount === "number" ? usage.candidatesTokenCount : null, error: null, metadata: payload,
      };
    } catch (error) { return providerFailure("gemini", model, startedAt, error); }
  },
};
