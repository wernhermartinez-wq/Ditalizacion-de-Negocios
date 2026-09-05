import type { Json, Tables } from "@/lib/supabase/database.types";

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

export const acquisitionChannels = [
  { value: "google_maps", label: "Google y Google Maps" },
  { value: "website", label: "Web y formularios" },
  { value: "seo", label: "SEO / búsquedas orgánicas" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "paid_ads", label: "Publicidad de pago" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Correo electrónico" },
  { value: "marketplaces", label: "Marketplaces o directorios" },
  { value: "referrals", label: "Recomendaciones" },
  { value: "partnerships", label: "Colaboraciones" },
  { value: "other", label: "Otro canal" },
] as const;

export type ChannelAttributionDetails = {
  usedChannels: string[];
  provenChannels: string[];
  tracksPerformance: boolean;
  unknownChannels: boolean;
};

const acquisitionChannelIds = new Set<string>(acquisitionChannels.map((channel) => channel.value));

function validChannelIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && acquisitionChannelIds.has(item)))];
}

export function normalizeChannelAttributionDetails(input: {
  usedChannels?: unknown;
  provenChannels?: unknown;
  tracksPerformance?: unknown;
  unknownChannels?: unknown;
}): ChannelAttributionDetails {
  const unknownChannels = input.unknownChannels === true;
  const usedChannels = unknownChannels ? [] : validChannelIds(input.usedChannels);
  const usedSet = new Set(usedChannels);
  const provenChannels = unknownChannels
    ? []
    : validChannelIds(input.provenChannels).filter((channel) => usedSet.has(channel));

  return {
    usedChannels,
    provenChannels,
    tracksPerformance: !unknownChannels && input.tracksPerformance === true,
    unknownChannels,
  };
}

export function readChannelAttributionDetails(value: Json | null | undefined): ChannelAttributionDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return normalizeChannelAttributionDetails({});
  }

  return normalizeChannelAttributionDetails({
    usedChannels: value.used_channels,
    provenChannels: value.proven_channels,
    tracksPerformance: value.tracks_performance === true,
    unknownChannels: value.unknown_channels === true,
  });
}

export function channelAttributionJson(details: ChannelAttributionDetails): Json {
  const normalized = normalizeChannelAttributionDetails(details);
  return {
    used_channels: normalized.usedChannels,
    proven_channels: normalized.provenChannels,
    tracks_performance: normalized.tracksPerformance,
    unknown_channels: normalized.unknownChannels,
  };
}

export function scoreChannelAttribution(details: ChannelAttributionDetails) {
  const normalized = normalizeChannelAttributionDetails(details);
  if (normalized.unknownChannels) return 1;
  if (!normalized.usedChannels.length) return null;
  if (!normalized.provenChannels.length) return 2;

  const coverage = normalized.provenChannels.length / normalized.usedChannels.length;
  if (coverage === 1 && normalized.tracksPerformance) return 5;
  if (coverage >= 0.5) return 4;
  return 3;
}

export function channelAttributionLabel(score: number | null) {
  if (score === 1) return "Canales sin identificar";
  if (score === 2) return "Usas canales, pero aún no compruebas resultados";
  if (score === 3) return "Compruebas resultados en algunos canales";
  if (score === 4) return "Compruebas resultados en la mayoría";
  if (score === 5) return "Compruebas, mides y mejoras todos tus canales";
  return "Selecciona tu situación";
}

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
