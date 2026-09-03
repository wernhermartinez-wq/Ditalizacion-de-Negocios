import { describe, expect, it } from "vitest";
import { calculateVisibilityMetrics } from "./metrics";

describe("visibility metrics", () => {
  it("expone numerador, denominador y respuestas trazables", () => {
    const metrics = calculateVisibilityMetrics([
      { id: "r1", promptId: "p1", status: "completed", hasClientMention: true, competitorMentions: 1, clientCitations: 1, authorityCitations: 0, positiveClientMention: true },
      { id: "r2", promptId: "p2", status: "completed", hasClientMention: false, competitorMentions: 2, clientCitations: 0, authorityCitations: 1, positiveClientMention: false },
      { id: "r3", promptId: "p3", status: "failed", hasClientMention: false, competitorMentions: 0, clientCitations: 0, authorityCitations: 0, positiveClientMention: false },
    ]);
    expect(metrics.presence).toEqual({ value: 50, numerator: 1, denominator: 2, responseIds: ["r1"] });
    expect(metrics.coverage.value).toBe(50);
    expect(metrics.shareOfVoice.value).toBe(25);
    expect(metrics.authority.responseIds).toEqual(["r2"]);
  });

  it("no divide por cero cuando no hay respuestas válidas", () => {
    expect(calculateVisibilityMetrics([]).presence.value).toBe(0);
  });
});
