import type { ProviderInput, VisibilityProviderAdapter } from "../types";
import { collectUrlCitations, fetchWithRetry, providerFailure } from "./shared";

export const perplexityVisibilityProvider: VisibilityProviderAdapter = {
  name: "perplexity",
  configured: () => Boolean(process.env.PERPLEXITY_API_KEY),
  async execute(input: ProviderInput) {
    const startedAt = Date.now();
    const model = process.env.PERPLEXITY_VISIBILITY_MODEL ?? "sonar-pro";
    if (!process.env.PERPLEXITY_API_KEY) return { ...providerFailure("perplexity", model, startedAt, "No configurada"), status: "not_configured" as const, error: "No configurada" };
    try {
      const response = await fetchWithRetry("https://api.perplexity.ai/v1/sonar", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: input.prompt }], search_recency_filter: "month" }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(`Perplexity ${response.status}: ${JSON.stringify(payload).slice(0, 350)}`);
      const choices = Array.isArray(payload.choices) ? payload.choices : [];
      const first = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : {};
      const message = first.message && typeof first.message === "object" ? first.message as Record<string, unknown> : {};
      const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
      return {
        provider: "perplexity" as const, status: "completed" as const, model: typeof payload.model === "string" ? payload.model : model,
        modelVersion: typeof payload.model === "string" ? payload.model : model, text: typeof message.content === "string" ? message.content : "",
        citations: collectUrlCitations(payload), durationMs: Date.now() - startedAt,
        inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
        outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null, error: null, metadata: payload,
      };
    } catch (error) { return providerFailure("perplexity", model, startedAt, error); }
  },
};
