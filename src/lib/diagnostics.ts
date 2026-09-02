import type { Tables } from "@/lib/supabase/database.types";

export const diagnosticDimensions = [
  { key: "digital_presence", code: "VIS", name: "Presencia y descubrimiento", color: "#d35a3d" },
  { key: "acquisition", code: "CAP", name: "Captación digital", color: "#f39a5a" },
  { key: "sales_funnel", code: "VEN", name: "Embudo y ventas", color: "#d69a50" },
  { key: "customer_experience", code: "CLI", name: "Experiencia y fidelización", color: "#ba7259" },
  { key: "data_automation", code: "DAT", name: "Datos y automatización", color: "#8f7965" },
  { key: "strategy_enablement", code: "EST", name: "Estrategia y capacidades", color: "#6f7a57" },
] as const;

const legacyDiagnosticDimensions = [
  { key: "digital_strategy", code: "EST", name: "Estrategia digital", color: "#d35a3d" },
  { key: "digital_readiness", code: "PRE", name: "Preparación digital", color: "#f39a5a" },
  { key: "digital_skills", code: "PER", name: "Personas y adopción digital", color: "#d69a50" },
  { key: "data_management", code: "DAT", name: "Gestión de datos", color: "#8f7965" },
  { key: "automation_intelligence", code: "AUT", name: "Automatización e inteligencia", color: "#ba7259" },
  { key: "green_digitalisation", code: "SOS", name: "Digitalización sostenible", color: "#6f7a57" },
] as const;

export const maturityScale = [
  { value: 0, label: "No aplica", short: "No aplica", description: "Esta actividad no forma parte de tu negocio." },
  { value: 1, label: "No lo hacemos", short: "No lo hacemos", description: "No se hace actualmente." },
  { value: 2, label: "A veces", short: "A veces", description: "Se hace de forma puntual o depende de que alguien se acuerde." },
  { value: 3, label: "Habitualmente", short: "Habitualmente", description: "Hay una forma de hacerlo y se usa en la mayoría de los casos." },
  { value: 4, label: "Siempre y revisado", short: "Siempre y revisado", description: "Se hace siempre y alguien comprueba que funcione." },
  { value: 5, label: "Medimos y mejoramos", short: "Medimos y mejoramos", description: "Revisamos el resultado y hacemos cambios para mejorarlo." },
] as const;

export type DiagnosticQuestion = Tables<"diagnostic_questions">;
export type DiagnosticResponse = Tables<"diagnostic_responses">;
export type DiagnosticDependency = Tables<"diagnostic_question_dependencies">;

export function isQuestionVisible(
  question: Pick<DiagnosticQuestion, "id" | "dependency_mode">,
  dependencies: DiagnosticDependency[],
  answers: ReadonlyMap<string, number>,
) {
  const rules = dependencies.filter((dependency) => dependency.child_question_id === question.id);
  if (!rules.length) return true;
  const matches = rules.map((rule) => {
    const value = answers.get(rule.parent_question_id);
    return typeof value === "number" && value >= rule.min_value && value <= rule.max_value;
  });
  return question.dependency_mode === "any" ? matches.some(Boolean) : matches.every(Boolean);
}

export function scoreValues(values: number[]) {
  const applicableValues = values.filter((value) => value >= 1 && value <= 5);
  if (!applicableValues.length) return null;
  return Math.round((applicableValues.reduce((sum, value) => sum + (value - 1) * 25, 0) / applicableValues.length) * 100) / 100;
}

export function scoreLabel(score: number | null) {
  if (score === null) return "Sin evaluar";
  if (score < 25) return "Inicial";
  if (score < 50) return "En desarrollo";
  if (score < 75) return "Avanzado";
  return "Consolidado";
}

export function dimensionScores(questions: DiagnosticQuestion[], responses: DiagnosticResponse[]) {
  const valuesByQuestion = new Map(responses.map((response) => [response.question_id, response.value]));
  const dimensions = questions.some((question) => question.dimension === "digital_presence")
    ? diagnosticDimensions
    : legacyDiagnosticDimensions;
  return dimensions.map((dimension) => {
    const values = questions
      .filter((question) => question.dimension === dimension.key)
      .map((question) => valuesByQuestion.get(question.id))
      .filter((value): value is number => typeof value === "number");
    return { ...dimension, score: scoreValues(values), answered: values.length };
  });
}
