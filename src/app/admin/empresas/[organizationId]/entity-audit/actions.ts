"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";
import { identityDraftFromForm, normalizeUrl, nullable } from "@/lib/entity-audit-core";
import { createNextIdentityDraft, ensureEntityAuditCase } from "@/lib/entity-audit";
import { evaluateEntityAuditCampaign } from "@/lib/entity-audit-factual";
import { interventionProposalContentFromForm, interventionProposalFromForm, proposalReviewFromForm } from "@/lib/entity-audit-proposals";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { executeVisibilityRun } from "@/lib/visibility/runner";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sourceTypes = new Set(["restaurant", "website", "google_business", "directory", "social", "reservation", "menu", "other"]);

function destination(organizationId: string, type: "error" | "success", text: string): never {
  redirect(`/admin/empresas/${organizationId}/entity-audit?${new URLSearchParams({ [type]: text })}`);
}

async function adminContext(organizationId: string) {
  if (!UUID.test(organizationId)) redirect("/admin");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId || !(await isPlatformAdmin(supabase, userId))) redirect("/app");
  return { supabase, admin: createAdminClient(), userId };
}

async function requireAuditCase(
  admin: SupabaseClient<Database>,
  organizationId: string,
  auditCaseId?: string,
) {
  let query = admin
    .from("entity_audit_cases")
    .select("id, organization_id")
    .eq("organization_id", organizationId);
  if (auditCaseId) query = query.eq("id", auditCaseId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("El expediente no pertenece a la organización indicada.");
  return data;
}

async function requireIdentityVersion(
  admin: SupabaseClient<Database>,
  organizationId: string,
  versionId: string,
  requiredStatus?: "draft",
) {
  let query = admin
    .from("entity_identity_versions")
    .select("id, case_id, status")
    .eq("id", versionId);
  if (requiredStatus) query = query.eq("status", requiredStatus);
  const { data: version, error } = await query.maybeSingle();
  if (error) throw error;
  if (!version) throw new Error("La versión de identidad indicada no es válida.");
  await requireAuditCase(admin, organizationId, version.case_id);
  return version;
}

export async function activateEntityAudit(organizationId: string) {
  const { admin, userId } = await adminContext(organizationId);
  try {
    await ensureEntityAuditCase(admin, organizationId, userId, "admin");
  } catch {
    destination(organizationId, "error", "No se pudo activar el expediente Entity Audit.");
  }
  revalidatePath(`/admin/empresas/${organizationId}`);
  destination(organizationId, "success", "Expediente activado y borrador inicial creado.");
}

export async function saveIdentityDraft(organizationId: string, versionId: string, formData: FormData) {
  if (!UUID.test(versionId)) destination(organizationId, "error", "Versión no válida.");
  const { admin } = await adminContext(organizationId);
  try {
    const version = await requireIdentityVersion(admin, organizationId, versionId, "draft");
    const input = identityDraftFromForm(formData);
    const { error } = await admin.from("entity_identity_versions").update({
      commercial_name: input.commercialName,
      legal_name: input.legalName,
      name_variants: input.nameVariants,
      website_url: input.websiteUrl,
      domain: input.domain,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      postal_code: input.postalCode,
      city: input.city,
      region: input.region,
      country_code: input.countryCode,
      phone: input.phone,
      opening_hours: input.openingHours,
      categories: input.categories,
      specialties: input.specialties,
      services: input.services,
      menu_url: input.menuUrl,
      reservation_url: input.reservationUrl,
      contact_url: input.contactUrl,
      official_profiles: input.officialProfiles,
      external_identifiers: input.externalIdentifiers,
    }).eq("id", version.id).eq("case_id", version.case_id).eq("status", "draft");
    if (error) throw error;
  } catch (error) {
    destination(organizationId, "error", error instanceof Error ? error.message : "No se pudo guardar el borrador.");
  }
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Borrador de identidad guardado.");
}

export async function validateIdentity(organizationId: string, versionId: string, formData: FormData) {
  if (!UUID.test(versionId)) destination(organizationId, "error", "Versión no válida.");
  const { supabase, admin } = await adminContext(organizationId);
  const note = nullable(formData.get("validationNote"), 1000);
  try {
    await requireIdentityVersion(admin, organizationId, versionId, "draft");
  } catch (error) {
    destination(organizationId, "error", error instanceof Error ? error.message : "Versión no válida.");
  }
  const { error } = await supabase.rpc("validate_entity_identity_version", {
    p_version_id: versionId,
    p_validation_note: note ?? undefined,
  });
  if (error) destination(organizationId, "error", error.message);
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app/perfil");
  destination(organizationId, "success", "Identidad oficial validada. La auditoría inicial ya puede habilitarse en una entrega futura.");
}

export async function createIdentityDraft(organizationId: string, auditCaseId: string) {
  if (!UUID.test(auditCaseId)) destination(organizationId, "error", "Expediente no válido.");
  const { admin, userId } = await adminContext(organizationId);
  try {
    await requireAuditCase(admin, organizationId, auditCaseId);
    await createNextIdentityDraft(admin, auditCaseId, userId);
  } catch {
    destination(organizationId, "error", "No se pudo crear una nueva versión.");
  }
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Nueva versión borrador creada desde la identidad vigente.");
}

export async function addObservation(organizationId: string, auditCaseId: string, formData: FormData) {
  if (!UUID.test(auditCaseId)) destination(organizationId, "error", "Expediente no válido.");
  const { admin, userId } = await adminContext(organizationId);
  const fieldKey = String(formData.get("fieldKey") ?? "").trim().slice(0, 80);
  const value = String(formData.get("value") ?? "").trim().slice(0, 4000);
  const kind = formData.get("observationKind") === "declared" ? "declared" : "observed";
  const sourceTypeRaw = String(formData.get("sourceType") ?? "other");
  const sourceType = sourceTypes.has(sourceTypeRaw) ? sourceTypeRaw : "other";
  const sourceName = String(formData.get("sourceName") ?? "").trim().slice(0, 160);
  if (!fieldKey || !value) destination(organizationId, "error", "Indica el campo y el valor observado.");

  try {
    await requireAuditCase(admin, organizationId, auditCaseId);
  } catch (error) {
    destination(organizationId, "error", error instanceof Error ? error.message : "Expediente no válido.");
  }

  let sourceId: string | null = null;
  if (sourceName) {
    const { data: source, error: sourceError } = await admin.from("entity_sources").insert({
      case_id: auditCaseId,
      source_type: sourceType,
      name: sourceName,
      url: normalizeUrl(formData.get("sourceUrl")),
      last_checked_at: new Date().toISOString(),
      created_by: userId,
    }).select("id").single();
    if (sourceError) destination(organizationId, "error", "No se pudo registrar la fuente.");
    sourceId = source.id;
  }

  const { error } = await admin.from("entity_observations").insert({
    case_id: auditCaseId,
    source_id: sourceId,
    field_key: fieldKey,
    observation_kind: kind,
    value,
    internal_note: nullable(formData.get("internalNote"), 1500),
    created_by: userId,
  });
  if (error) destination(organizationId, "error", "No se pudo registrar la observación.");
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Dato incorporado al expediente interno.");
}

export async function saveEntityAuditCustomQuestions(organizationId: string, formData: FormData) {
  const { supabase } = await adminContext(organizationId);
  const questions = Array.from({ length: 5 }, (_, index) =>
    String(formData.get(`question${index + 1}`) ?? "").trim().slice(0, 800),
  ).filter(Boolean);
  if (questions.some((question) => question.length < 10)) {
    destination(organizationId, "error", "Cada pregunta personalizada debe tener al menos 10 caracteres.");
  }
  const { error } = await supabase.rpc("create_entity_audit_custom_question_set", {
    p_organization_id: organizationId,
    p_questions: questions,
  });
  if (error) destination(organizationId, "error", error.message);
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", `Versión de preguntas guardada (${questions.length}/5 personalizadas).`);
}

type PreparedCampaign = {
  campaign_id: string;
  project_id: string;
  identity_version_id: string;
  prompt_ids: string[];
};

function preparedCampaign(value: unknown): PreparedCampaign | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.campaign_id !== "string" || typeof item.project_id !== "string"
    || typeof item.identity_version_id !== "string" || !Array.isArray(item.prompt_ids)
    || !item.prompt_ids.every((id) => typeof id === "string")) return null;
  return item as PreparedCampaign;
}

export async function runInitialEntityAuditCampaign(organizationId: string) {
  const { supabase, admin, userId } = await adminContext(organizationId);
  const idempotencyKey = `entity-initial-${organizationId}-${crypto.randomUUID()}`;
  const { data, error } = await supabase.rpc("prepare_entity_audit_campaign", {
    p_organization_id: organizationId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) destination(organizationId, "error", error.message);
  const prepared = preparedCampaign(data);
  if (!prepared) destination(organizationId, "error", "No se pudo preparar una campaña válida.");
  try {
    await executeVisibilityRun({
      projectId: prepared.project_id,
      promptIds: prepared.prompt_ids,
      idempotencyKey,
      triggerType: "manual",
      createdBy: userId,
      entityAuditCampaignId: prepared.campaign_id,
      entityIdentityVersionId: prepared.identity_version_id,
      scheduleNextRun: false,
    });
  } catch (executionError) {
    await admin.from("entity_audit_campaigns").update({ status: "failed" }).eq("id", prepared.campaign_id);
    destination(organizationId, "error", executionError instanceof Error ? executionError.message : "No se pudo ejecutar la campaña.");
  }
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  revalidatePath(`/admin/empresas/${organizationId}/visibilidad`);
  revalidatePath("/app/visibilidad");
  destination(organizationId, "success", "Medición inicial ejecutada con el motor de visibilidad de Nexaro.");
}

export async function saveFactualEvaluationBudget(organizationId: string, campaignId: string, formData: FormData) {
  if (!UUID.test(campaignId)) destination(organizationId, "error", "Campaña no válida.");
  const { admin, userId } = await adminContext(organizationId);
  const budgetUsd = Number(formData.get("budgetUsd"));
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0.01 || budgetUsd > 10) {
    destination(organizationId, "error", "El presupuesto debe estar entre 0,01 y 10 USD.");
  }
  const { data: campaign } = await admin.from("entity_audit_campaigns").select("id")
    .eq("id", campaignId).eq("organization_id", organizationId).maybeSingle();
  if (!campaign) destination(organizationId, "error", "La campaña no pertenece al restaurante.");
  const { data: current } = await admin.from("entity_audit_evaluation_budgets").select("spent_usd, reserved_usd")
    .eq("campaign_id", campaignId).maybeSingle();
  if (current && budgetUsd < current.spent_usd + current.reserved_usd) {
    destination(organizationId, "error", "El presupuesto no puede ser inferior al consumo ya registrado o reservado.");
  }
  const { error } = await admin.from("entity_audit_evaluation_budgets").upsert({
    campaign_id: campaignId,
    organization_id: organizationId,
    budget_usd: Number(budgetUsd.toFixed(6)),
    updated_by: userId,
  }, { onConflict: "campaign_id" });
  if (error) destination(organizationId, "error", "No se pudo actualizar el presupuesto factual.");
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Presupuesto factual actualizado.");
}

export async function runFactualEvaluation(organizationId: string, campaignId: string) {
  if (!UUID.test(campaignId)) destination(organizationId, "error", "Campaña no válida.");
  const { admin, userId } = await adminContext(organizationId);
  const { data: campaign } = await admin.from("entity_audit_campaigns").select("id")
    .eq("id", campaignId).eq("organization_id", organizationId).maybeSingle();
  if (!campaign) destination(organizationId, "error", "La campaña no pertenece al restaurante.");
  let result;
  try {
    result = await evaluateEntityAuditCampaign(
      admin,
      campaignId,
      userId,
      `factual-${campaignId}-${crypto.randomUUID()}`,
    );
  } catch (error) {
    destination(organizationId, "error", error instanceof Error ? error.message : "No se pudo ejecutar la evaluación factual.");
  }
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", result.idempotent
    ? "La evaluación factual ya estaba registrada."
    : "Evaluación factual registrada y pendiente de revisión humana.");
}

export async function reviewFactualFinding(organizationId: string, findingId: string, formData: FormData) {
  if (!UUID.test(findingId)) destination(organizationId, "error", "Hallazgo no válido.");
  const { admin, userId } = await adminContext(organizationId);
  const reviewStatus = String(formData.get("reviewStatus") ?? "pending");
  if (!["pending", "confirmed", "dismissed"].includes(reviewStatus)) {
    destination(organizationId, "error", "Estado de revisión no válido.");
  }
  const { data: finding } = await admin.from("entity_audit_findings").select("id")
    .eq("id", findingId).eq("organization_id", organizationId).maybeSingle();
  if (!finding) destination(organizationId, "error", "El hallazgo no pertenece al restaurante.");
  const reviewedAt = reviewStatus === "pending" ? null : new Date().toISOString();
  const { error: findingError } = await admin.from("entity_audit_findings").update({
    review_status: reviewStatus,
    reviewed_by: reviewStatus === "pending" ? null : userId,
    reviewed_at: reviewedAt,
  }).eq("id", findingId).eq("organization_id", organizationId);
  if (findingError) destination(organizationId, "error", "No se pudo revisar el hallazgo.");
  const internalNote = nullable(formData.get("internalNote"), 2000);
  if (reviewStatus === "pending" && !internalNote) {
    await admin.from("entity_audit_finding_reviews").delete().eq("finding_id", findingId);
  } else {
    const { error: reviewError } = await admin.from("entity_audit_finding_reviews").upsert({
      finding_id: findingId,
      organization_id: organizationId,
      internal_note: internalNote,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }, { onConflict: "finding_id" });
    if (reviewError) destination(organizationId, "error", "El estado se guardó, pero no la nota interna.");
  }
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Revisión factual guardada.");
}

export async function createInterventionProposal(organizationId: string, formData: FormData) {
  const { supabase, userId } = await adminContext(organizationId);
  let input;
  try {
    input = interventionProposalFromForm(formData);
  } catch (error) {
    destination(organizationId, "error", error instanceof Error ? error.message : "La propuesta no es válida.");
  }
  const { error } = await supabase.rpc("create_entity_audit_intervention_proposal", {
    p_organization_id: organizationId,
    p_created_by: userId,
    p_finding_ids: input.findingIds,
    p_phase: input.phase,
    p_verified_problem: input.verifiedProblem,
    p_hypothesis: input.hypothesis,
    p_suggested_action: input.suggestedAction,
    p_expected_result: input.expectedResult,
    p_internal_note: input.internalNote,
  });
  if (error) destination(organizationId, "error", error.message);
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Propuesta creada como borrador interno.");
}

export async function updateInterventionProposal(organizationId: string, proposalId: string, formData: FormData) {
  if (!UUID.test(proposalId)) destination(organizationId, "error", "Propuesta no válida.");
  const { admin } = await adminContext(organizationId);
  let input;
  try {
    input = interventionProposalContentFromForm(formData);
  } catch (error) {
    destination(organizationId, "error", error instanceof Error ? error.message : "La propuesta no es válida.");
  }
  const { data: proposal } = await admin.from("entity_audit_intervention_proposals").select("id,review_status")
    .eq("id", proposalId).eq("organization_id", organizationId).maybeSingle();
  if (!proposal || proposal.review_status !== "draft") destination(organizationId, "error", "Sólo puede editarse un borrador del restaurante.");
  const { error } = await admin.from("entity_audit_intervention_proposals").update({
    phase: input.phase,
    verified_problem: input.verifiedProblem,
    hypothesis: input.hypothesis,
    suggested_action: input.suggestedAction,
    expected_result: input.expectedResult,
    internal_note: input.internalNote,
  }).eq("id", proposalId).eq("organization_id", organizationId).eq("review_status", "draft");
  if (error) destination(organizationId, "error", "No se pudo editar la propuesta.");
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Borrador de propuesta actualizado.");
}

export async function reviewInterventionProposal(organizationId: string, proposalId: string, formData: FormData) {
  if (!UUID.test(proposalId)) destination(organizationId, "error", "Propuesta no válida.");
  const { admin, userId } = await adminContext(organizationId);
  let input;
  try {
    input = proposalReviewFromForm(formData);
  } catch (error) {
    destination(organizationId, "error", error instanceof Error ? error.message : "La revisión no es válida.");
  }
  const { data: proposal } = await admin.from("entity_audit_intervention_proposals").select("id,review_status")
    .eq("id", proposalId).eq("organization_id", organizationId).maybeSingle();
  if (!proposal || proposal.review_status !== "draft") destination(organizationId, "error", "La propuesta ya fue revisada o no pertenece al restaurante.");
  const { error } = await admin.from("entity_audit_intervention_proposals").update({
    review_status: input.reviewStatus,
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    client_visible: input.clientVisible,
    client_summary: input.clientSummary,
  }).eq("id", proposalId).eq("organization_id", organizationId).eq("review_status", "draft");
  if (error) destination(organizationId, "error", "No se pudo revisar la propuesta.");
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", input.reviewStatus === "approved" ? "Propuesta aprobada." : "Propuesta descartada.");
}

export async function linkInterventionProposal(organizationId: string, proposalId: string, formData: FormData) {
  if (!UUID.test(proposalId)) destination(organizationId, "error", "Propuesta no válida.");
  const taskId = String(formData.get("taskId") ?? "");
  if (!UUID.test(taskId)) destination(organizationId, "error", "Selecciona una actuación existente.");
  const { supabase } = await adminContext(organizationId);
  const { data: proposal } = await supabase.from("entity_audit_intervention_proposals").select("id")
    .eq("id", proposalId).eq("organization_id", organizationId).maybeSingle();
  if (!proposal) destination(organizationId, "error", "La propuesta no pertenece al restaurante.");
  const { error } = await supabase.rpc("link_entity_audit_proposal_to_task", {
    p_proposal_id: proposalId,
    p_task_id: taskId,
  });
  if (error) destination(organizationId, "error", error.message);
  revalidatePath(`/admin/empresas/${organizationId}/entity-audit`);
  destination(organizationId, "success", "Propuesta vinculada a la actuación existente sin modificar su estado.");
}
