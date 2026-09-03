export const visibilityProviders = ["openai", "gemini", "perplexity"] as const;
export type VisibilityProviderName = (typeof visibilityProviders)[number];

export type ProviderCitation = {
  url: string;
  title?: string;
  snippet?: string;
};

export type ProviderInput = {
  prompt: string;
  country: string;
  language: "es" | "de";
};

export type ProviderResult = {
  provider: VisibilityProviderName;
  status: "completed" | "not_configured" | "failed";
  model: string | null;
  modelVersion: string | null;
  text: string | null;
  citations: ProviderCitation[];
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  error: string | null;
  metadata: Record<string, unknown>;
};

export interface VisibilityProviderAdapter {
  readonly name: VisibilityProviderName;
  configured(): boolean;
  execute(input: ProviderInput): Promise<ProviderResult>;
}

export type EntityCandidate = {
  type: "client" | "competitor";
  name: string;
  variants: string[];
  competitorId?: string;
};

export type AnalyzedMention = {
  entityType: "client" | "competitor";
  entityName: string;
  competitorId: string | null;
  sentiment: "positive" | "neutral" | "negative";
  attributes: string[];
  evidence: string;
  confidence: number;
  needsReview: boolean;
};

export type MetricEvidence = {
  value: number;
  numerator: number;
  denominator: number;
  responseIds: string[];
};

export type VisibilityMetrics = {
  presence: MetricEvidence;
  citation: MetricEvidence;
  coverage: MetricEvidence;
  shareOfVoice: MetricEvidence;
  positiveSentiment: MetricEvidence;
  authority: MetricEvidence;
  competitivePosition: MetricEvidence;
};
