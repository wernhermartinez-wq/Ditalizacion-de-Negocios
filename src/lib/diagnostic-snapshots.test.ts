import { describe, expect, it } from "vitest";
import { buildDiagnosticSnapshot, roadmapFromSnapshot } from "./diagnostic-snapshots";
import type { DiagnosticQuestion, DiagnosticResponse } from "./diagnostics";

const question = (id: string, dimension: string): DiagnosticQuestion => ({
  id,
  questionnaire_id: "questionnaire",
  dimension,
  prompt: `Pregunta de prueba ${id}`,
  position: 1,
  required: true,
  dependency_mode: "all",
  evidence_examples: null,
  guidance: null,
});

const response = (questionId: string, value: number): DiagnosticResponse => ({
  diagnostic_id: "diagnostic",
  question_id: questionId,
  value,
  answered_by: "user",
  updated_at: "2026-09-03T00:00:00.000Z",
});

describe("diagnostic snapshots", () => {
  it("conserva Sin evaluar y excluye esa dimensión de la hoja de ruta", () => {
    const questions = [question("q1", "digital_presence"), question("q2", "acquisition")];
    const snapshot = buildDiagnosticSnapshot(questions, [response("q1", 0), response("q2", 2)]);

    expect(snapshot.scores.find((item) => item.dimension_id === "digital_presence")).toMatchObject({
      score: null,
      nivel: "Sin evaluar",
      tipo_resultado: "sin_evaluar",
    });
    expect(snapshot.roadmap.map((item) => item.dimension_id)).not.toContain("digital_presence");
    expect(snapshot.roadmap.map((item) => item.dimension_id)).toContain("acquisition");
  });

  it("reconstruye arrays inmutables de una fila persistida", () => {
    const [item] = roadmapFromSnapshot([{
      id: "item",
      roadmap_id: "roadmap",
      dimension_id: "acquisition",
      dimension_name: "Captación digital",
      code: "CAP",
      color: "#000000",
      score: 25,
      phase: 1,
      period: "0–30 días",
      priority: "Alta",
      title: "Mejorar captación",
      objective: "Captar mejor",
      actions: ["Acción"],
      success: "Evidencia",
      weaknesses: ["Brecha"],
      position: 1,
      created_at: "2026-09-03T00:00:00.000Z",
    }]);

    expect(item.actions).toEqual(["Acción"]);
    expect(item.weaknesses).toEqual(["Brecha"]);
  });
});
