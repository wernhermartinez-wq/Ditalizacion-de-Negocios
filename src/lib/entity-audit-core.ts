import type { Json } from "@/lib/supabase/database.types";

export type IdentityDraftInput = {
  commercialName: string;
  legalName: string | null;
  nameVariants: string[];
  websiteUrl: string | null;
  domain: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  countryCode: string;
  phone: string | null;
  openingHours: Json;
  categories: string[];
  specialties: string[];
  services: string[];
  menuUrl: string | null;
  reservationUrl: string | null;
  contactUrl: string | null;
  officialProfiles: Json;
  externalIdentifiers: Json;
};

export function splitList(value: string, limit = 30) {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

export function nullable(value: FormDataEntryValue | null, maxLength: number) {
  const normalized = String(value ?? "").trim().slice(0, maxLength);
  return normalized || null;
}

export function normalizeUrl(value: FormDataEntryValue | null) {
  const raw = nullable(value, 500);
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function domainFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function canStartInitialEntityAudit(
  caseStatus: string | null | undefined,
  identityStatus: string | null | undefined,
) {
  return caseStatus === "ready" && identityStatus === "validated";
}

export function identityDraftFromForm(formData: FormData): IdentityDraftInput {
  const commercialName = String(formData.get("commercialName") ?? "").trim().slice(0, 160);
  if (commercialName.length < 2) throw new Error("Indica un nombre comercial válido.");
  const websiteUrl = normalizeUrl(formData.get("websiteUrl"));
  const countryCode = String(formData.get("countryCode") ?? "ES").trim().toUpperCase().slice(0, 2) || "ES";
  const profiles = splitList(String(formData.get("officialProfiles") ?? ""), 40)
    .map((value) => normalizeUrl(value))
    .filter((value): value is string => Boolean(value));

  return {
    commercialName,
    legalName: nullable(formData.get("legalName"), 200),
    nameVariants: splitList(String(formData.get("nameVariants") ?? "")),
    websiteUrl,
    domain: domainFromUrl(websiteUrl),
    addressLine1: nullable(formData.get("addressLine1"), 200),
    addressLine2: nullable(formData.get("addressLine2"), 200),
    postalCode: nullable(formData.get("postalCode"), 24),
    city: nullable(formData.get("city"), 120),
    region: nullable(formData.get("region"), 120),
    countryCode,
    phone: nullable(formData.get("phone"), 50),
    openingHours: { text: String(formData.get("openingHours") ?? "").trim().slice(0, 2000) },
    categories: splitList(String(formData.get("categories") ?? "")),
    specialties: splitList(String(formData.get("specialties") ?? "")),
    services: splitList(String(formData.get("services") ?? "")),
    menuUrl: normalizeUrl(formData.get("menuUrl")),
    reservationUrl: normalizeUrl(formData.get("reservationUrl")),
    contactUrl: normalizeUrl(formData.get("contactUrl")),
    officialProfiles: profiles,
    externalIdentifiers: {},
  };
}
