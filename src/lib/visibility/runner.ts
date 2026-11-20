import type { Json, Tables } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeMentions, analyzeVisibilityPlacement, normalizeCitations } from "./analysis";
import { calculateVisibilityMetrics, type MetricResponse } from "./metrics";
import { providerAdapters } from "./providers";
import { buildRecommendations } from "./recommendations";
import { assertVisibilityQueryBudget, determineRunStatus, isDuplicateRunError } from "./run-policy";
import { visibilityLimits } from "./config";
import type { EntityCandidate, VisibilityProviderName } from "./types";

type RunOptions = {
  projectId: string;
  idempotencyKey: string;
  triggerType: "manual" | "scheduled";
  createdBy?: string | null;
  providers?: VisibilityProviderName[];
  promptIds?: string[];
  entityAuditCampaignId?: string;
  entityIdentityVersionId?: string;
  scheduleNextRun?: boolean;
};

export async function executeVisibilityRun(options: RunOptions) {
  const supabase = createAdminClient();
  let requested = [...new Set(options.providers?.length ? options.providers : providerAdapters.map((item) => item.name))];
  let campaignPromptIds: string[] | null = null;
  let campaignQueryBudget: number | null = null;
  const existing = await supabase.from("visibility_runs").select("*").eq("project_id", options.projectId).eq("idempotency_key", options.idempotencyKey).maybeSingle();
  if (existing.data) return { run: existing.data, idempotent: true };

  const projectResult = await supabase.from("visibility_projects").select("*").eq("id", options.projectId).maybeSingle();
  if (projectResult.error || !projectResult.data) throw new Error("El proyecto de visibilidad no existe.");
  const project = projectResult.data;
  if (options.entityAuditCampaignId) {
    const campaignResult = await supabase.from("entity_audit_campaigns")
      .select("id, case_id, identity_version_id, visibility_project_id, status, query_budget, requested_providers")
      .eq("id", options.entityAuditCampaignId).maybeSingle();
    const campaign = campaignResult.data;
    if (!campaign || campaign.visibility_project_id !== project.id
      || campaign.identity_version_id !== options.entityIdentityVersionId) {
      throw new Error("La campaña Entity Audit no está preparada para esta identidad y proyecto.");
    }
    if (campaign.status !== "prepared") {
      const priorRun = await supabase.from("visibility_runs").select("*")
        .eq("entity_audit_campaign_id", campaign.id).maybeSingle();
      if (priorRun.data) return { run: priorRun.data, idempotent: true };
      throw new Error("La campaña Entity Audit ya fue reclamada para su ejecución.");
    }
    requested = [...new Set(campaign.requested_providers.filter((provider): provider is VisibilityProviderName =>
      providerAdapters.some((adapter) => adapter.name === provider)))];
    if (!requested.length || requested.length !== new Set(campaign.requested_providers).size) {
      throw new Error("La campaña Entity Audit contiene proveedores no admitidos.");
    }
    campaignQueryBudget = campaign.query_budget;
    const [identityResult, caseResult, questionsResult] = await Promise.all([
      supabase.from("entity_identity_versions").select("id").eq("id", campaign.identity_version_id)
        .eq("case_id", campaign.case_id).eq("status", "validated").maybeSingle(),
      supabase.from("entity_audit_cases").select("id").eq("id", campaign.case_id).eq("status", "ready")
        .eq("current_identity_version_id", campaign.identity_version_id).maybeSingle(),
      supabase.from("entity_audit_campaign_questions").select("visibility_prompt_id")
        .eq("campaign_id", campaign.id).order("position"),
    ]);
    if (!identityResult.data || !caseResult.data || questionsResult.error) {
      throw new Error("La identidad comercial dejó de estar validada antes de la ejecución.");
    }
    campaignPromptIds = (questionsResult.data ?? []).map((item) => item.visibility_prompt_id);
  }
  const limits = visibilityLimits(project.settings);

  const selectedPromptIds = campaignPromptIds ?? options.promptIds ?? [];
  const promptLimit = campaignPromptIds ? 15 : limits.maxActivePrompts;
  let promptsQuery = supabase.from("visibility_prompts").select("*").eq("project_id", project.id).eq("status", "approved").eq("active", true).order("created_at").limit(promptLimit);
  if (selectedPromptIds.length) promptsQuery = promptsQuery.in("id", selectedPromptIds.slice(0, promptLimit));
  const [promptsResult, competitorsResult] = await Promise.all([
    promptsQuery,
    supabase.from("visibility_competitors").select("*").eq("project_id", project.id).eq("active", true).order("created_at").limit(limits.maxCompetitors),
  ]);
  if (promptsResult.error || competitorsResult.error) throw new Error("No se pudo preparar la ejecución.");
  const prompts = promptsResult.data ?? [];
  if (!prompts.length) throw new Error("No hay preguntas aprobadas para ejecutar.");
  if (campaignPromptIds && prompts.length !== campaignPromptIds.length) {
    throw new Error("La campaña Entity Audit no conserva todas sus preguntas aprobadas.");
  }
  const adapters = providerAdapters.filter((adapter) => requested.includes(adapter.name));
  if (campaignQueryBudget !== null) {
    assertVisibilityQueryBudget(prompts.length, adapters.length, campaignQueryBudget);
  }

  const startedAt = new Date();
  const runResult = await supabase.from("visibility_runs").insert({
    project_id: project.id, idempotency_key: options.idempotencyKey, trigger_type: options.triggerType,
    status: "running", requested_providers: requested, started_at: startedAt.toISOString(), created_by: options.createdBy ?? null,
    entity_audit_campaign_id: options.entityAuditCampaignId ?? null,
    entity_identity_version_id: options.entityIdentityVersionId ?? null,
  }).select("*").single();
  if (runResult.error) {
    if (isDuplicateRunError(runResult.error)) {
      const duplicate = options.entityAuditCampaignId
        ? await supabase.from("visibility_runs").select("*").eq("entity_audit_campaign_id", options.entityAuditCampaignId).maybeSingle()
        : await supabase.from("visibility_runs").select("*").eq("project_id", project.id).eq("idempotency_key", options.idempotencyKey).maybeSingle();
      if (duplicate.data) return { run: duplicate.data, idempotent: true };
    }
    throw new Error("No se pudo iniciar la ejecución.");
  }
  const run = runResult.data;
  if (options.entityAuditCampaignId) {
    const claimed = await supabase.from("entity_audit_campaigns").update({
      status: "running", visibility_run_id: run.id, started_at: startedAt.toISOString(),
    }).eq("id", options.entityAuditCampaignId).eq("visibility_project_id", project.id)
      .eq("status", "prepared").is("visibility_run_id", null).select("id").maybeSingle();
    if (claimed.error || !claimed.data) {
      await supabase.from("visibility_runs").delete().eq("id", run.id);
      const duplicate = await supabase.from("visibility_runs").select("*")
        .eq("entity_audit_campaign_id", options.entityAuditCampaignId).maybeSingle();
      if (duplicate.data) return { run: duplicate.data, idempotent: true };
      throw new Error("La campaña Entity Audit ya fue reclamada para su ejecución.");
    }
  }
  const entities: EntityCandidate[] = [
    { type: "client", name: project.brand_name, variants: project.brand_variants },
    ...(competitorsResult.data ?? []).map((item) => ({ type: "competitor" as const, name: item.name, variants: item.name_variants, competitorId: item.id })),
  ];
  const metricResponses: MetricResponse[] = [];
  let completedProviders = 0;
  let failedProviders = 0;

  for (const prompt of prompts) {
    const results = await Promise.all(adapters.map((adapter) => adapter.execute({ prompt: prompt.question, country: prompt.country, language: prompt.language as "es" | "de" })));
    for (const result of results) {
      const mentions = result.text ? analyzeMentions(result.text, entities) : [];
      const citations = normalizeCitations(result.citations, project.domain);
      const clientMentions = mentions.filter((item) => item.entityType === "client");
      const placement = result.text ? analyzeVisibilityPlacement(result.text, entities) : {
        structure: "unknown" as const, orderedPosition: null, firstMention: null, clientPresent: false,
      };
      const responseResult = await supabase.from("visibility_responses").insert({
        run_id: run.id, prompt_id: prompt.id, provider: result.provider, model: result.model, model_version: result.modelVersion,
        country: prompt.country, language: prompt.language, original_response: result.text, status: result.status,
        duration_ms: result.durationMs, input_tokens: result.inputTokens, output_tokens: result.outputTokens,
        sentiment: clientMentions[0]?.sentiment ?? null, confidence: clientMentions[0]?.confidence ?? null,
        needs_review: clientMentions.some((item) => item.needsReview), error_message: result.error,
        raw_metadata: result.metadata as Json,
        response_structure: placement.structure,
        ordered_position: placement.orderedPosition,
        first_mention: placement.firstMention,
        client_present: placement.clientPresent,
      }).select("id").single();
      if (responseResult.error) continue;
      const responseId = responseResult.data.id;
      if (mentions.length) await supabase.from("visibility_mentions").insert(mentions.map((mention) => ({
        response_id: responseId, competitor_id: mention.competitorId, entity_type: mention.entityType,
        entity_name: mention.entityName, sentiment: mention.sentiment, attributes: mention.attributes,
        evidence: mention.evidence, confidence: mention.confidence, needs_review: mention.needsReview,
      })));
      if (citations.length) await supabase.from("visibility_citations").insert(citations.map((citation) => ({
        response_id: responseId, url: citation.url, domain: citation.domain, title: citation.title ?? null,
        snippet: citation.snippet ?? null, position: citation.position, is_client_domain: citation.isClientDomain,
        is_external_authority: citation.isExternalAuthority,
      })));
      await supabase.from("visibility_usage_events").insert({
        project_id: project.id, run_id: run.id, provider: result.provider, event_type: "request", quantity: 1,
        input_tokens: result.inputTokens, output_tokens: result.outputTokens,
        metadata: { status: result.status, model: result.model } as Json,
      });
      if (result.status === "completed") completedProviders += 1; else failedProviders += 1;
      metricResponses.push({
        id: responseId, promptId: prompt.id, status: result.status, hasClientMention: clientMentions.length > 0,
        competitorMentions: mentions.filter((item) => item.entityType === "competitor").length,
        clientCitations: citations.filter((item) => item.isClientDomain).length,
        authorityCitations: citations.filter((item) => item.isExternalAuthority).length,
        positiveClientMention: clientMentions.some((item) => item.sentiment === "positive"),
        orderedPosition: placement.orderedPosition,
        firstMention: placement.firstMention,
      });
    }
  }

  const metrics = calculateVisibilityMetrics(metricResponses);
  await supabase.from("visibility_metric_snapshots").insert({ project_id: project.id, run_id: run.id, metrics: metrics as unknown as Json });
  const recommendations = buildRecommendations(metrics, run.id);
  if (recommendations.length) await supabase.from("visibility_recommendations").insert(recommendations.map((item) => ({
    project_id: project.id, run_id: item.run_id, title: item.title, reason: item.reason, evidence: item.evidence,
    impact: item.impact, priority: item.priority, created_by: options.createdBy ?? null,
    related_response_ids: metricResponses.map((response) => response.id), related_prompt_ids: prompts.map((prompt) => prompt.id),
  })));

  const completedAt = new Date();
  const status = determineRunStatus(completedProviders, failedProviders);
  const updateResult = await supabase.from("visibility_runs").update({
    status, completed_at: completedAt.toISOString(), duration_ms: completedAt.getTime() - startedAt.getTime(),
    error_summary: failedProviders ? `${failedProviders} consulta(s) no se completaron.` : null,
  }).eq("id", run.id).select("*").single();
  if (options.entityAuditCampaignId) {
    await supabase.from("entity_audit_campaigns").update({
      status, completed_at: completedAt.toISOString(), visibility_run_id: run.id,
    }).eq("id", options.entityAuditCampaignId).eq("visibility_project_id", project.id);
  }
  if (options.scheduleNextRun !== false && project.schedule_frequency === "weekly") {
    const next = new Date(completedAt); next.setUTCDate(next.getUTCDate() + 7);
    await supabase.from("visibility_projects").update({ next_run_at: next.toISOString() }).eq("id", project.id);
  }
  return { run: updateResult.data ?? run, idempotent: false, metrics };
}

export type VisibilityProject = Tables<"visibility_projects">;
