import type { Tables } from "@/lib/supabase/database.types";

export const diagnosticDimensions = [
  { key: "digital_presence", code: "VIS", name: "Presencia y descubrimiento", color: "#4ba8a6" },
  { key: "acquisition", code: "CAP", name: "Captación digital", color: "#65b995" },
  { key: "sales_funnel", code: "VEN", name: "Embudo y ventas", color: "#d5aa4d" },
  { key: "customer_experience", code: "CLI", name: "Experiencia y fidelización", color: "#c98262" },
  { key: "data_automation", code: "DAT", name: "Datos y automatización", color: "#708fbd" },
  { key: "strategy_enablement", code: "EST", name: "Estrategia y capacidades", color: "#8b79bb" },
] as const;

const legacyDiagnosticDimensions = [
  { key: "digital_strategy", code: "EST", name: "Estrategia digital", color: "#4ba8a6" },
  { key: "digital_readiness", code: "PRE", name: "Preparación digital", color: "#65b995" },
  { key: "digital_skills", code: "PER", name: "Personas y adopción digital", color: "#d5aa4d" },
  { key: "data_management", code: "DAT", name: "Gestión de datos", color: "#5f9fbd" },
  { key: "automation_intelligence", code: "AUT", name: "Automatización e inteligencia", color: "#8b79bb" },
  { key: "green_digitalisation", code: "SOS", name: "Digitalización sostenible", color: "#bd7e63" },
] as const;

export const maturityScale = [
  { value: 0, label: "No aplica", short: "N/A", description: "La práctica no corresponde a la actividad de la empresa." },
  { value: 1, label: "No existe", short: "No existe", description: "No se realiza o no hay evidencia de que se realice." },
  { value: 2, label: "Inicial", short: "Inicial", description: "Se hace de manera informal, reactiva o en casos aislados." },
  { value: 3, label: "Definido", short: "Definido", description: "Existe un método claro, pero no se aplica todavía en toda la empresa." },
  { value: 4, label: "Medido", short: "Medido", description: "Se aplica de forma consistente y se revisa con datos o responsables." },
  { value: 5, label: "Optimizado", short: "Optimizado", description: "Está integrado, demuestra resultados y se mejora periódicamente." },
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
