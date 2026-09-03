import { describe, expect, it } from "vitest";
import { buildEvolutionTimeline, scoreDelta } from "@/lib/evolution";

describe("buildEvolutionTimeline", () => {
  it("orders validated diagnostics and excludes dimensions without a score from the average", () => {
    const timeline = buildEvolutionTimeline(
      [
        { id: "new", validated_at: "2026-08-01T00:00:00.000Z" },
        { id: "old", validated_at: "2026-04-01T00:00:00.000Z" },
      ],
      [
        { assessment_id: "old", dimension_id: "digital_presence", score: 25 },
        { assessment_id: "old", dimension_id: "acquisition", score: null },
        { assessment_id: "new", dimension_id: "digital_presence", score: 75 },
        { assessment_id: "new", dimension_id: "acquisition", score: 25 },
      ],
    );

    expect(timeline.map((point) => point.diagnosticId)).toEqual(["old", "new"]);
    expect(timeline[0].overallScore).toBe(25);
    expect(timeline[1].overallScore).toBe(50);
  });
});

describe("scoreDelta", () => {
  it("returns a signed difference when both scores exist", () => {
    expect(scoreDelta(67.25, 50)).toBe(17.25);
  });

  it("does not invent a comparison for missing scores", () => {
    expect(scoreDelta(null, 50)).toBeNull();
  });
});
