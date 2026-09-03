import type { VisibilityMetrics } from "./types";

export function buildRecommendations(metrics: VisibilityMetrics, runId: string) {
  const recommendations: Array<{ title: string; reason: string; evidence: string; impact: string; priority: "high" | "medium"; run_id: string }> = [];
  if (metrics.presence.value < 50) recommendations.push({ title: "Reforzar las señales que explican qué ofrece la empresa", reason: "La marca aparece en menos de la mitad de las respuestas analizadas.", evidence: `${metrics.presence.numerator} de ${metrics.presence.denominator} respuestas mencionan la marca.`, impact: "Aumentar la probabilidad de ser incluida cuando un cliente pide recomendaciones relacionadas.", priority: "high", run_id: runId });
  if (metrics.citation.value < 35) recommendations.push({ title: "Crear activos citables en el dominio propio", reason: "Los asistentes apenas utilizan el sitio de la empresa como fuente.", evidence: `${metrics.citation.numerator} de ${metrics.citation.denominator} respuestas citan el dominio propio.`, impact: "Ganar autoridad y convertir menciones genéricas en visitas verificables.", priority: "high", run_id: runId });
  if (metrics.coverage.value < 60) recommendations.push({ title: "Cubrir las preguntas comerciales sin respuesta", reason: "La marca solo aparece en una parte de las necesidades que buscan los clientes.", evidence: `Cobertura actual: ${metrics.coverage.value} %.`, impact: "Extender la visibilidad a más servicios y etapas del embudo de ventas.", priority: "medium", run_id: runId });
  return recommendations;
}

export function recommendationToTask(input: { id: string; title: string; reason: string; evidence: string; impact: string; priority: string }) {
  return {
    source: "visibility" as const,
    source_reference: input.id,
    title: input.title,
    description: `${input.reason}\n\nEvidencia: ${input.evidence}\n\nImpacto: ${input.impact}`,
    priority: input.priority,
  };
}
