import type { VisibilityMetrics } from "./types";

export type MetricResponse = {
  id: string;
  promptId: string;
  status: string;
  hasClientMention: boolean;
  competitorMentions: number;
  clientCitations: number;
  authorityCitations: number;
  positiveClientMention: boolean;
};

const percent = (numerator: number, denominator: number) => denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
const evidence = (numerator: number, denominator: number, ids: string[]) => ({ value: percent(numerator, denominator), numerator, denominator, responseIds: ids });

export function calculateVisibilityMetrics(responses: MetricResponse[]): VisibilityMetrics {
  const completed = responses.filter((response) => response.status === "completed");
  const mentioned = completed.filter((response) => response.hasClientMention);
  const cited = completed.filter((response) => response.clientCitations > 0);
  const authority = completed.filter((response) => response.authorityCitations > 0);
  const positive = mentioned.filter((response) => response.positiveClientMention);
  const distinctPrompts = new Set(completed.map((response) => response.promptId));
  const coveredPrompts = new Set(mentioned.map((response) => response.promptId));
  const clientMentions = mentioned.length;
  const competitorMentions = completed.reduce((sum, response) => sum + response.competitorMentions, 0);
  const totalMentions = clientMentions + competitorMentions;
  return {
    presence: evidence(clientMentions, completed.length, mentioned.map((item) => item.id)),
    citation: evidence(cited.length, completed.length, cited.map((item) => item.id)),
    coverage: evidence(coveredPrompts.size, distinctPrompts.size, mentioned.map((item) => item.id)),
    shareOfVoice: evidence(clientMentions, totalMentions, mentioned.map((item) => item.id)),
    positiveSentiment: evidence(positive.length, mentioned.length, positive.map((item) => item.id)),
    authority: evidence(authority.length, completed.length, authority.map((item) => item.id)),
    competitivePosition: evidence(clientMentions, Math.max(clientMentions, competitorMentions), mentioned.map((item) => item.id)),
  };
}

export function metricLabel(key: keyof VisibilityMetrics) {
  return ({ presence: "Presencia", citation: "Citación propia", coverage: "Cobertura", shareOfVoice: "Cuota de voz", positiveSentiment: "Sentimiento positivo", authority: "Autoridad", competitivePosition: "Posición competitiva" } as const)[key];
}
