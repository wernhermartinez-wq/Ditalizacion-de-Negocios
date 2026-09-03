import { diagnosticDimensions } from "@/lib/diagnostics";

export type ValidatedDiagnostic = {
  id: string;
  validated_at: string | null;
};

export type DimensionSnapshot = {
  assessment_id: string;
  dimension_id: string;
  score: number | null;
};

export type EvolutionPoint = {
  diagnosticId: string;
  validatedAt: string;
  overallScore: number | null;
  dimensions: Array<{
    key: string;
    code: string;
    name: string;
    color: string;
    score: number | null;
  }>;
};

function average(values: Array<number | null>) {
  const applicable = values.filter((value): value is number => value !== null);
  if (!applicable.length) return null;
  return Math.round((applicable.reduce((sum, value) => sum + value, 0) / applicable.length) * 100) / 100;
}

export function buildEvolutionTimeline(
  diagnostics: ValidatedDiagnostic[],
  snapshots: DimensionSnapshot[],
): EvolutionPoint[] {
  const scoresByDiagnostic = new Map<string, Map<string, number | null>>();

  for (const snapshot of snapshots) {
    const scores = scoresByDiagnostic.get(snapshot.assessment_id) ?? new Map<string, number | null>();
    scores.set(snapshot.dimension_id, snapshot.score);
    scoresByDiagnostic.set(snapshot.assessment_id, scores);
  }

  return diagnostics
    .filter((diagnostic): diagnostic is ValidatedDiagnostic & { validated_at: string } => Boolean(diagnostic.validated_at))
    .toSorted((left, right) => left.validated_at.localeCompare(right.validated_at))
    .map((diagnostic) => {
      const scores = scoresByDiagnostic.get(diagnostic.id) ?? new Map<string, number | null>();
      const dimensions = diagnosticDimensions.map((dimension) => ({
        ...dimension,
        score: scores.get(dimension.key) ?? null,
      }));

      return {
        diagnosticId: diagnostic.id,
        validatedAt: diagnostic.validated_at,
        overallScore: average(dimensions.map((dimension) => dimension.score)),
        dimensions,
      };
    });
}

export function scoreDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 100) / 100;
}
