import type { AnalyzedMention, EntityCandidate, ProviderCitation } from "./types";

const positiveWords = ["recomienda", "destaca", "fiable", "líder", "mejor", "excelente", "especialista", "empfiehlt", "führend", "zuverlässig"];
const negativeWords = ["evita", "problema", "mala", "limitado", "riesgo", "schlecht", "problem", "vermeiden"];
const attributeWords = ["precio", "calidad", "servicio", "experiencia", "innovación", "local", "rapidez", "seo", "automatización", "beratung", "qualität", "preis"];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function sentimentFor(context: string): "positive" | "neutral" | "negative" {
  const value = normalized(context);
  const positive = positiveWords.filter((word) => value.includes(normalized(word))).length;
  const negative = negativeWords.filter((word) => value.includes(normalized(word))).length;
  if (positive > negative) return "positive";
  if (negative > positive) return "negative";
  return "neutral";
}

export function analyzeMentions(text: string, entities: EntityCandidate[]): AnalyzedMention[] {
  const haystack = normalized(text);
  return entities.flatMap((entity) => {
    const aliases = [entity.name, ...entity.variants].filter(Boolean);
    const alias = aliases.find((candidate) => haystack.includes(normalized(candidate)));
    if (!alias) return [];
    const index = haystack.indexOf(normalized(alias));
    const start = Math.max(0, index - 180);
    const end = Math.min(text.length, index + alias.length + 240);
    const evidence = text.slice(start, end).trim();
    const exactName = normalized(alias) === normalized(entity.name);
    const confidence = exactName ? 0.92 : 0.78;
    return [{
      entityType: entity.type,
      entityName: entity.name,
      competitorId: entity.competitorId ?? null,
      sentiment: sentimentFor(evidence),
      attributes: attributeWords.filter((word) => normalized(evidence).includes(normalized(word))),
      evidence,
      confidence,
      needsReview: confidence < 0.8,
    }];
  });
}

export function normalizeDomain(value: string) {
  try { return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase(); }
}

export function normalizeCitations(citations: ProviderCitation[], clientDomain: string) {
  const ownDomain = normalizeDomain(clientDomain);
  return citations.flatMap((citation, index) => {
    const domain = normalizeDomain(citation.url);
    if (!domain || !citation.url.startsWith("http")) return [];
    return [{ ...citation, domain, position: index + 1, isClientDomain: domain === ownDomain || domain.endsWith(`.${ownDomain}`), isExternalAuthority: domain.endsWith(".gov") || domain.endsWith(".edu") || domain.endsWith(".org") }];
  });
}
