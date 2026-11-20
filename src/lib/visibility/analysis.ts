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

export type VisibilityPlacement = {
  structure: "ordered" | "unordered" | "unknown";
  orderedPosition: number | null;
  firstMention: boolean | null;
  clientPresent: boolean;
};

function firstAliasIndex(text: string, entity: EntityCandidate) {
  const haystack = normalized(text);
  const indexes = [entity.name, ...entity.variants]
    .filter(Boolean)
    .map((alias) => haystack.indexOf(normalized(alias)))
    .filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

export function analyzeVisibilityPlacement(text: string, entities: EntityCandidate[]): VisibilityPlacement {
  const client = entities.find((entity) => entity.type === "client");
  if (!client || !text.trim()) {
    return { structure: "unknown", orderedPosition: null, firstMention: null, clientPresent: false };
  }
  const clientIndex = firstAliasIndex(text, client);
  if (clientIndex < 0) {
    return { structure: "unknown", orderedPosition: null, firstMention: false, clientPresent: false };
  }

  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (const line of lines) {
    const match = line.match(/^\s*(\d{1,3})[.)]\s+/);
    if (match && clientIndex >= offset && clientIndex < offset + line.length + 1) {
      return {
        structure: "ordered",
        orderedPosition: Number(match[1]),
        firstMention: null,
        clientPresent: true,
      };
    }
    offset += line.length + 1;
  }

  const competitorIndexes = entities
    .filter((entity) => entity.type === "competitor")
    .map((entity) => firstAliasIndex(text, entity))
    .filter((index) => index >= 0);
  const firstEntityIndex = competitorIndexes.length ? Math.min(clientIndex, ...competitorIndexes) : clientIndex;
  return {
    structure: "unordered",
    orderedPosition: null,
    firstMention: clientIndex === firstEntityIndex,
    clientPresent: true,
  };
}
