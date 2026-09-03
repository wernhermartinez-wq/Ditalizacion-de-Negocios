import type { Json, Tables } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeMentions, normalizeCitations } from "./analysis";
import { calculateVisibilityMetrics, type MetricResponse } from "./metrics";
import { providerAdapters } from "./providers";
import { buildRecommendations } from "./recommendations";
import { determineRunStatus, isDuplicateRunError } from "./run-policy";
import { visibilityLimits } from "./config";
import type { EntityCandidate, VisibilityProviderName } from "./types";

type RunOptions = {
  projectId: string;
  idempotencyKey: string;
  triggerType: "manual" | "scheduled";
  createdBy?: string | null;
  providers?: VisibilityProviderName[];
  promptIds?: string[];
};

export async function executeVisibilityRun(options: RunOptions) {
  const supabase = createAdminClient();
  const requested = options.providers?.length ? options.providers : providerAdapters.map((item) => item.name);
  const existing = await supabase.from("visibility_runs").select("*").eq("project_id", options.projectId).eq("idempotency_key", options.idempotencyKey).maybeSingle();
  if (existing.data) return { run: existing.data, idempotent: true };

  const projectResult = await supabase.from("visibility_projects").select("*").eq("id", options.projectId).maybeSingle();
  if (projectResult.error || !projectResult.data) throw new Error("El proyecto de visibilidad no existe.");
  const project = projectResult.data;
  const limits = visibilityLimits(project.settings);

  let promptsQuery = supabase.from("visibility_prompts").select("*").eq("project_id", project.id).eq("status", "approved").eq("active", true).order("created_at").limit(limits.maxActivePrompts);
  if (options.promptIds?.length) promptsQuery = promptsQuery.in("id", options.promptIds.slice(0, limits.maxActivePrompts));
  const [promptsResult, competitorsResult] = await Promise.all([
    promptsQuery,
    supabase.from("visibility_competitors").select("*").eq("project_id", project.id).eq("active", true).order("created_at").limit(limits.maxCompetitors),
  ]);
  if (promptsResult.error || competitorsResult.error) throw new Error("No se pudo preparar la ejecución.");
  const prompts = promptsResult.data ?? [];
  if (!prompts.length) throw new Error("No hay preguntas aprobadas para ejecutar.");

  const startedAt = new Date();
  const runResult = await supabase.from("visibility_runs").insert({
    project_id: project.id, idempotency_key: options.idempotencyKey, trigger_type: options.triggerType,
    status: "running", requested_providers: requested, started_at: startedAt.toISOString(), created_by: options.createdBy ?? null,
  }).select("*").single();
  if (runResult.error) {
    if (isDuplicateRunError(runResult.error)) {
      const duplicate = await supabase.from("visibility_runs").select("*").eq("project_id", project.id).eq("idempotency_key", options.idempotencyKey).single();
      if (duplicate.data) return { run: duplicate.data, idempotent: true };
    }
    throw new Error("No se pudo iniciar la ejecución.");
  }
  const run = runResult.data;
  const entities: EntityCandidate[] = [
    { type: "client", name: project.brand_name, variants: project.brand_variants },
    ...(competitorsResult.data ?? []).map((item) => ({ type: "competitor" as const, name: item.name, variants: item.name_variants, competitorId: item.id })),
  ];
  const metricResponses: MetricResponse[] = [];
  let completedProviders = 0;
  let failedProviders = 0;

  for (const prompt of prompts) {
    const adapters = providerAdapters.filter((adapter) => requested.includes(adapter.name));
    const results = await Promise.all(adapters.map((adapter) => adapter.execute({ prompt: prompt.question, country: prompt.country, language: prompt.language as "es" | "de" })));
    for (const result of results) {
      const mentions = result.text ? analyzeMentions(result.text, entities) : [];
      const citations = normalizeCitations(result.citations, project.domain);
      const clientMentions = mentions.filter((item) => item.entityType === "client");
      const responseResult = await supabase.from("visibility_responses").insert({
        run_id: run.id, prompt_id: prompt.id, provider: result.provider, model: result.model, model_version: result.modelVersion,
        country: prompt.country, language: prompt.language, original_response: result.text, status: result.status,
        duration_ms: result.durationMs, input_tokens: result.inputTokens, output_tokens: result.outputTokens,
        sentiment: clientMentions[0]?.sentiment ?? null, confidence: clientMentions[0]?.confidence ?? null,
        needs_review: clientMentions.some((item) => item.needsReview), error_message: result.error,
        raw_metadata: result.metadata as Json,
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
  if (project.schedule_frequency === "weekly") {
    const next = new Date(completedAt); next.setUTCDate(next.getUTCDate() + 7);
    await supabase.from("visibility_projects").update({ next_run_at: next.toISOString() }).eq("id", project.id);
  }
  return { run: updateResult.data ?? run, idempotent: false, metrics };
}

export type VisibilityProject = Tables<"visibility_projects">;
