import type { ProviderInput, VisibilityProviderAdapter } from "../types";
import { collectUrlCitations, fetchWithRetry, providerFailure } from "./shared";

export const openAIVisibilityProvider: VisibilityProviderAdapter = {
  name: "openai",
  configured: () => Boolean(process.env.OPENAI_API_KEY),
  async execute(input: ProviderInput) {
    const startedAt = Date.now();
    const model = process.env.OPENAI_VISIBILITY_MODEL ?? "gpt-5.4-mini";
    if (!process.env.OPENAI_API_KEY) return { ...providerFailure("openai", model, startedAt, "No configurada"), status: "not_configured" as const, error: "No configurada" };
    try {
      const response = await fetchWithRetry("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: input.prompt,
          tools: [{ type: "web_search", user_location: { type: "approximate", country: input.country } }],
          include: ["web_search_call.action.sources"],
          store: false,
        }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(`OpenAI ${response.status}: ${JSON.stringify(payload).slice(0, 350)}`);
      const output = Array.isArray(payload.output) ? payload.output : [];
      const text = output.flatMap((item) => {
        const content = item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).content) ? (item as { content: unknown[] }).content : [];
        return content.map((part) => part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? String((part as Record<string, unknown>).text) : "");
      }).filter(Boolean).join("\n");
      const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
      return {
        provider: "openai" as const, status: "completed" as const, model: typeof payload.model === "string" ? payload.model : model,
        modelVersion: typeof payload.model === "string" ? payload.model : model, text, citations: collectUrlCitations(payload),
        durationMs: Date.now() - startedAt, inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : null,
        outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : null, error: null, metadata: payload,
      };
    } catch (error) { return providerFailure("openai", model, startedAt, error); }
  },
};
