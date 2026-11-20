import type { Json, Tables } from "@/lib/supabase/database.types";

export const factualClassifications = ["correct", "incorrect", "unverifiable", "outdated"] as const;
export type FactualClassification = (typeof factualClassifications)[number];

export const factualFieldKeys = [
  "commercial_name", "legal_name", "website_url", "domain", "address", "postal_code",
  "city", "region", "country_code", "phone", "opening_hours", "categories", "specialties",
  "services", "menu_url", "reservation_url", "contact_url", "official_profiles", "other",
] as const;
export type FactualFieldKey = (typeof factualFieldKeys)[number];

export type FactualSourceResponse = {
  id: string;
  provider: "openai" | "gemini" | "perplexity";
  originalResponse: string;
};

export type FactualClaimCandidate = {
  responseId: string;
  assertion: string;
  fieldKey: FactualFieldKey;
  classification: FactualClassification;
  evidence: string;
  findingKey: string | null;
};

export type FactualEvaluationOutput = { claims: FactualClaimCandidate[] };

export type FactualCostRates = { inputPerMillion: number; outputPerMillion: number };
export const defaultFactualCostRates: FactualCostRates = { inputPerMillion: 0.75, outputPerMillion: 4.5 };

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export function estimateTokenCount(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}

export function calculateFactualCost(inputTokens: number, outputTokens: number, rates = defaultFactualCostRates) {
  if (!Number.isInteger(inputTokens) || !Number.isInteger(outputTokens)
    || !finiteNonNegative(inputTokens) || !finiteNonNegative(outputTokens)
    || !finiteNonNegative(rates.inputPerMillion) || !finiteNonNegative(rates.outputPerMillion)) {
    throw new Error("No se puede calcular el coste con valores no válidos.");
  }
  return Number(((inputTokens * rates.inputPerMillion + outputTokens * rates.outputPerMillion) / 1_000_000).toFixed(6));
}

export function estimateFactualEvaluationCost(
  prompt: string,
  responseCount: number,
  rates = defaultFactualCostRates,
) {
  const inputTokens = estimateTokenCount(prompt);
  const outputTokens = Math.min(24_000, Math.max(1_200, responseCount * 420));
  return {
    inputTokens,
    outputTokens,
    estimatedUsd: calculateFactualCost(inputTokens, outputTokens, rates),
  };
}

function normalizedKey(value: string, fallback: string) {
  const normalized = value.trim().toLocaleLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 180);
  return normalized || fallback;
}

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function parseFactualEvaluationOutput(value: unknown, responseIds: Set<string>): FactualEvaluationOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("La evaluación factual no devolvió un objeto válido.");
  const rawClaims = (value as Record<string, unknown>).claims;
  if (!Array.isArray(rawClaims)) throw new Error("La evaluación factual no contiene afirmaciones.");
  const claims = rawClaims.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Afirmación ${index + 1} no válida.`);
    const item = raw as Record<string, unknown>;
    const responseId = typeof item.response_id === "string" ? item.response_id : "";
    const assertion = typeof item.assertion === "string" ? item.assertion.trim().slice(0, 2000) : "";
    const fieldKey = typeof item.field_key === "string" ? item.field_key : "";
    const classification = typeof item.classification === "string" ? item.classification : "";
    const evidence = typeof item.evidence === "string" ? item.evidence.trim().slice(0, 2000) : "";
    if (!responseIds.has(responseId) || !assertion || !evidence
      || !factualFieldKeys.includes(fieldKey as FactualFieldKey)
      || !factualClassifications.includes(classification as FactualClassification)) {
      throw new Error(`Afirmación ${index + 1} no cumple el contrato factual.`);
    }
    const rawFindingKey = typeof item.finding_key === "string" ? item.finding_key : "";
    return {
      responseId,
      assertion,
      fieldKey: fieldKey as FactualFieldKey,
      classification: classification as FactualClassification,
      evidence,
      findingKey: classification === "correct" ? null : normalizedKey(rawFindingKey, `${fieldKey}:${fingerprint(assertion)}`),
    };
  });
  return { claims };
}

export function identityEvidenceForField(identity: Tables<"entity_identity_versions">, fieldKey: FactualFieldKey): Json {
  const valueByField: Record<FactualFieldKey, Json> = {
    commercial_name: identity.commercial_name,
    legal_name: identity.legal_name,
    website_url: identity.website_url,
    domain: identity.domain,
    address: [identity.address_line_1, identity.address_line_2].filter(Boolean).join(", ") || null,
    postal_code: identity.postal_code,
    city: identity.city,
    region: identity.region,
    country_code: identity.country_code,
    phone: identity.phone,
    opening_hours: identity.opening_hours,
    categories: identity.categories,
    specialties: identity.specialties,
    services: identity.services,
    menu_url: identity.menu_url,
    reservation_url: identity.reservation_url,
    contact_url: identity.contact_url,
    official_profiles: identity.official_profiles,
    other: null,
  };
  return { identity_version_id: identity.id, field: fieldKey, value: valueByField[fieldKey] };
}

export function buildStoredFactualResult(
  output: FactualEvaluationOutput,
  responses: FactualSourceResponse[],
  identity: Tables<"entity_identity_versions">,
) {
  const responseMap = new Map(responses.map((response) => [response.id, response]));
  const claims = output.claims.map((claim) => {
    const response = responseMap.get(claim.responseId);
    if (!response) throw new Error("La afirmación no pertenece a las respuestas evaluadas.");
    return {
      response_id: response.id,
      provider: response.provider,
      assertion_text: claim.assertion,
      field_key: claim.fieldKey,
      classification: claim.classification,
      evidence_text: claim.evidence,
      identity_evidence: identityEvidenceForField(identity, claim.fieldKey),
      finding_key: claim.findingKey,
      claim_fingerprint: fingerprint(`${response.id}|${claim.fieldKey}|${claim.assertion.toLocaleLowerCase()}`),
    };
  });

  const grouped = new Map<string, typeof claims>();
  claims.filter((claim) => claim.classification !== "correct" && claim.finding_key).forEach((claim) => {
    const key = claim.finding_key as string;
    grouped.set(key, [...(grouped.get(key) ?? []), claim]);
  });
  const findings = [...grouped.entries()].map(([key, items]) => ({
    finding_key: key,
    field_key: items[0].field_key,
    classification: items.some((item) => item.classification === "incorrect") ? "incorrect"
      : items.some((item) => item.classification === "outdated") ? "outdated" : "unverifiable",
    summary: items[0].assertion_text,
    evidence_summary: items[0].evidence_text,
    provider_count: new Set(items.map((item) => item.provider)).size,
    response_count: new Set(items.map((item) => item.response_id)).size,
  }));
  return { claims, findings };
}

export function buildFactualEvaluationPrompt(identity: Tables<"entity_identity_versions">, responses: FactualSourceResponse[]) {
  const officialIdentity = {
    identity_version_id: identity.id,
    commercial_name: identity.commercial_name,
    legal_name: identity.legal_name,
    name_variants: identity.name_variants,
    website_url: identity.website_url,
    domain: identity.domain,
    address: [identity.address_line_1, identity.address_line_2].filter(Boolean).join(", ") || null,
    postal_code: identity.postal_code,
    city: identity.city,
    region: identity.region,
    country_code: identity.country_code,
    phone: identity.phone,
    opening_hours: identity.opening_hours,
    categories: identity.categories,
    specialties: identity.specialties,
    services: identity.services,
    menu_url: identity.menu_url,
    reservation_url: identity.reservation_url,
    contact_url: identity.contact_url,
    official_profiles: identity.official_profiles,
  };
  return JSON.stringify({ official_identity: officialIdentity, recorded_responses: responses }, null, 2);
}
