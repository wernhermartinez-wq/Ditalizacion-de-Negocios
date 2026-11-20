import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { domainFromUrl, normalizeUrl } from "@/lib/entity-audit-core";

export type EntityAuditActivationSource = "subscription" | "admin";
export type IdentityVersion = Tables<"entity_identity_versions">;

export async function ensureEntityAuditCase(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  activatedBy: string | null,
  activationSource: EntityAuditActivationSource,
) {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, legal_name, website, city, country, sector")
    .eq("id", organizationId)
    .single();
  if (organizationError) throw organizationError;

  const normalizedWebsite = organization.website
    ? normalizeUrl(organization.website)
    : null;
  const { data: auditCaseId, error: ensureError } = await supabase.rpc("ensure_entity_audit_case", {
    p_organization_id: organizationId,
    p_activated_by: activatedBy,
    p_activation_source: activationSource,
    p_commercial_name: organization.name,
    p_legal_name: organization.legal_name,
    p_website_url: normalizedWebsite,
    p_domain: domainFromUrl(normalizedWebsite),
    p_city: organization.city,
    p_country_code: organization.country === "España"
      ? "ES"
      : organization.country.slice(0, 2).toUpperCase(),
    p_categories: organization.sector ? [organization.sector] : [],
  });
  if (ensureError) throw ensureError;

  const { data: auditCase, error: caseError } = await supabase
    .from("entity_audit_cases")
    .select("id, organization_id, status, current_identity_version_id")
    .eq("id", auditCaseId)
    .single();
  if (caseError) throw caseError;

  return auditCase;
}

export async function createNextIdentityDraft(
  supabase: SupabaseClient<Database>,
  auditCaseId: string,
  createdBy: string,
) {
  const { data: currentDraft, error: draftError } = await supabase
    .from("entity_identity_versions")
    .select("id")
    .eq("case_id", auditCaseId)
    .eq("status", "draft")
    .maybeSingle();
  if (draftError) throw draftError;
  if (currentDraft) return currentDraft.id;

  const { data: latest, error: latestError } = await supabase
    .from("entity_identity_versions")
    .select("*")
    .eq("case_id", auditCaseId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  if (latestError) throw latestError;

  const { data, error } = await supabase.from("entity_identity_versions").insert({
    case_id: latest.case_id,
    version_number: latest.version_number + 1,
    status: "draft",
    commercial_name: latest.commercial_name,
    legal_name: latest.legal_name,
    name_variants: latest.name_variants,
    website_url: latest.website_url,
    domain: latest.domain,
    address_line_1: latest.address_line_1,
    address_line_2: latest.address_line_2,
    postal_code: latest.postal_code,
    city: latest.city,
    region: latest.region,
    country_code: latest.country_code,
    latitude: latest.latitude,
    longitude: latest.longitude,
    phone: latest.phone,
    opening_hours: latest.opening_hours,
    categories: latest.categories,
    specialties: latest.specialties,
    services: latest.services,
    menu_url: latest.menu_url,
    reservation_url: latest.reservation_url,
    contact_url: latest.contact_url,
    official_profiles: latest.official_profiles,
    external_identifiers: latest.external_identifiers,
    created_by: createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}
