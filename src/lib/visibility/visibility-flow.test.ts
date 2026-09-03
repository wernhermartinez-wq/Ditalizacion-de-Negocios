import { describe, expect, it } from "vitest";
import { analyzeMentions, normalizeCitations } from "./analysis";
import { calculateVisibilityMetrics } from "./metrics";
import { buildRecommendations, recommendationToTask } from "./recommendations";

describe("recorrido completo de visibilidad", () => {
  it("transforma una respuesta fundamentada en métrica, recomendación y tarea Nexaro", () => {
    const responseId = "response-1";
    const promptId = "prompt-1";
    const mentions = analyzeMentions(
      "Nexaro ofrece acompañamiento digital claro. Agencia Norte es otra alternativa.",
      [
        { type: "client", name: "Nexaro", variants: ["Nexaro IA"] },
        { type: "competitor", name: "Agencia Norte", variants: [], competitorId: "competitor-1" },
      ],
    );
    const citations = normalizeCitations([{ url: "https://fuente-ejemplo.es/empresas" }], "nexaro-ia.com");
    const metrics = calculateVisibilityMetrics([{
      id: responseId,
      promptId,
      status: "completed",
      hasClientMention: mentions.some((item) => item.entityType === "client"),
      competitorMentions: mentions.filter((item) => item.entityType === "competitor").length,
      clientCitations: citations.filter((item) => item.isClientDomain).length,
      authorityCitations: citations.filter((item) => item.isExternalAuthority).length,
      positiveClientMention: mentions.some((item) => item.entityType === "client" && item.sentiment === "positive"),
    }]);
    const recommendations = buildRecommendations(metrics, "run-1");
    const citationRecommendation = recommendations.find((item) => item.title.includes("citables"));
    expect(metrics.presence.responseIds).toEqual([responseId]);
    expect(citationRecommendation).toBeDefined();
    const task = recommendationToTask({ id: "recommendation-1", ...citationRecommendation! });
    expect(task).toMatchObject({ source: "visibility", source_reference: "recommendation-1", priority: "high" });
    expect(task.description).toContain("Evidencia:");
  });
});
