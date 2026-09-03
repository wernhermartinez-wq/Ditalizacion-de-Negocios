import type { SupabaseClient } from "@supabase/supabase-js";
import { diagnosticDimensions, dimensionScores, scoreLabel, type DiagnosticQuestion, type DiagnosticResponse } from "@/lib/diagnostics";
import { buildRoadmap, type RoadmapItem } from "@/lib/roadmap";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";

export const DIAGNOSTIC_FORMULA_VERSION = "commercial-growth-v3.1";

type AssessmentScore = Tables<"assessment_scores">;
type RoadmapSnapshotItem = Tables<"roadmap_items">;

function stringArray(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function buildDiagnosticSnapshot(questions: DiagnosticQuestion[], responses: DiagnosticResponse[]) {
  const scores = dimensionScores(questions, responses);
  const roadmap = buildRoadmap(questions, responses);

  return {
    scores: scores.map((dimension) => ({
      dimension_id: dimension.key,
      score: dimension.score,
      nivel: scoreLabel(dimension.score),
      tipo_resultado: dimension.score === null ? "sin_evaluar" : "calculado",
    })),
    roadmap: roadmap.map((item, index) => ({
      dimension_id: item.dimensionId,
      dimension_name: item.dimension,
      code: item.code,
      color: item.color,
      score: item.score,
      phase: item.phase,
      period: item.period,
      priority: item.priority,
      title: item.title,
      objective: item.objective,
      actions: item.actions,
      success: item.success,
      weaknesses: item.weaknesses,
      position: index + 1,
    })),
  };
}

export function dimensionsFromSnapshot(rows: AssessmentScore[]) {
  const byDimension = new Map(rows.map((row) => [row.dimension_id, row]));
  return diagnosticDimensions.map((dimension) => ({
    ...dimension,
    score: byDimension.get(dimension.key)?.score ?? null,
    answered: 0,
  }));
}

export function roadmapFromSnapshot(rows: RoadmapSnapshotItem[]): RoadmapItem[] {
  return [...rows]
    .sort((left, right) => left.position - right.position)
    .map((row) => ({
      dimensionId: row.dimension_id,
      dimension: row.dimension_name,
      code: row.code,
      color: row.color,
      score: row.score,
      phase: row.phase,
      period: row.period,
      priority: row.priority as RoadmapItem["priority"],
      title: row.title,
      objective: row.objective,
      actions: stringArray(row.actions),
      success: row.success,
      weaknesses: stringArray(row.weaknesses),
    }));
}

export async function loadDiagnosticSnapshot(supabase: SupabaseClient<Database>, diagnosticId: string) {
  const [scoresResult, roadmapResult] = await Promise.all([
    supabase.from("assessment_scores").select("*").eq("assessment_id", diagnosticId),
    supabase.from("roadmaps").select("*").eq("assessment_id", diagnosticId).maybeSingle(),
  ]);
  if (scoresResult.error || roadmapResult.error) throw new Error("No se pudo cargar el resultado validado.");

  const itemsResult = roadmapResult.data
    ? await supabase.from("roadmap_items").select("*").eq("roadmap_id", roadmapResult.data.id).order("position")
    : { data: [], error: null };
  if (itemsResult.error) throw new Error("No se pudo cargar la hoja de ruta validada.");

  return {
    scoreRows: scoresResult.data ?? [],
    roadmapRow: roadmapResult.data,
    itemRows: itemsResult.data ?? [],
  };
}
