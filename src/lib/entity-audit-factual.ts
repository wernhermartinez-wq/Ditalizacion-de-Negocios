import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFactualEvaluationPrompt,
  buildStoredFactualResult,
  estimateFactualEvaluationCost,
  type FactualSourceResponse,
} from "@/lib/entity-audit-factual-core";
import { openAIFactualEvaluator, type FactualEvaluator } from "@/lib/entity-audit-factual-evaluator";
import type { Database, Json } from "@/lib/supabase/database.types";

type Reservation = { evaluation_run_id: string; idempotent: boolean };

function reservation(value: Json): Reservation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, Json | undefined>;
  return typeof item.evaluation_run_id === "string" && typeof item.idempotent === "boolean"
    ? { evaluation_run_id: item.evaluation_run_id, idempotent: item.idempotent } : null;
}

function costRates() {
  return {
    inputPerMillion: Number(process.env.ENTITY_AUDIT_INPUT_USD_PER_MILLION ?? "0.75"),
    outputPerMillion: Number(process.env.ENTITY_AUDIT_OUTPUT_USD_PER_MILLION ?? "4.5"),
  };
}

export async function factualEvaluationPreview(
  supabase: SupabaseClient<Database>,
  campaignId: string,
) {
  const { data: campaign, error: campaignError } = await supabase.from("entity_audit_campaigns")
    .select("id, identity_version_id, visibility_run_id, status")
    .eq("id", campaignId).maybeSingle();
  if (campaignError || !campaign || !campaign.visibility_run_id
    || !["completed", "partial"].includes(campaign.status)) {
    throw new Error("La campaña todavía no tiene respuestas registradas para evaluar.");
  }
  const [identityResult, responsesResult] = await Promise.all([
    supabase.from("entity_identity_versions").select("*").eq("id", campaign.identity_version_id)
      .in("status", ["validated", "superseded"]).maybeSingle(),
    supabase.from("visibility_responses").select("id, provider, original_response")
      .eq("run_id", campaign.visibility_run_id).eq("status", "completed").not("original_response", "is", null),
  ]);
  if (identityResult.error || responsesResult.error || !identityResult.data) {
    throw new Error("No se pudo recuperar la identidad y las respuestas de la campaña.");
  }
  const responses: FactualSourceResponse[] = (responsesResult.data ?? []).flatMap((item) => {
    if (!item.original_response || !["openai", "gemini", "perplexity"].includes(item.provider)) return [];
    return [{ id: item.id, provider: item.provider as FactualSourceResponse["provider"], originalResponse: item.original_response }];
  });
  if (!responses.length) throw new Error("No existen respuestas originales completas para evaluar.");
  const prompt = buildFactualEvaluationPrompt(identityResult.data, responses);
  const estimate = estimateFactualEvaluationCost(prompt, responses.length, costRates());
  return { campaign, identity: identityResult.data, responses, prompt, estimate };
}

export async function evaluateEntityAuditCampaign(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  createdBy: string,
  idempotencyKey: string,
  evaluator: FactualEvaluator = openAIFactualEvaluator,
) {
  if (!evaluator.enabled) throw new Error("La ejecución factual pagada todavía no está habilitada.");
  const preview = await factualEvaluationPreview(supabase, campaignId);
  const { data: reserveData, error: reserveError } = await supabase.rpc("reserve_entity_audit_factual_evaluation", {
    p_campaign_id: campaignId,
    p_idempotency_key: idempotencyKey,
    p_estimated_cost_usd: preview.estimate.estimatedUsd,
    p_model: evaluator.model,
    p_created_by: createdBy,
  });
  if (reserveError) throw new Error(reserveError.message);
  const reserved = reservation(reserveData);
  if (!reserved) throw new Error("No se pudo reservar el presupuesto de evaluación.");
  if (reserved.idempotent) return { evaluationRunId: reserved.evaluation_run_id, idempotent: true };

  try {
    const evaluated = await evaluator.evaluate({
      prompt: preview.prompt,
      responseIds: new Set(preview.responses.map((response) => response.id)),
      maxOutputTokens: preview.estimate.outputTokens,
    });
    const stored = buildStoredFactualResult(evaluated.output, preview.responses, preview.identity);
    const { error: completeError } = await supabase.rpc("complete_entity_audit_factual_evaluation", {
      p_evaluation_run_id: reserved.evaluation_run_id,
      p_actual_cost_usd: evaluated.actualCostUsd,
      p_input_tokens: evaluated.inputTokens,
      p_output_tokens: evaluated.outputTokens,
      p_claims: stored.claims as unknown as Json,
      p_findings: stored.findings as unknown as Json,
    });
    if (completeError) throw new Error(completeError.message);
    return {
      evaluationRunId: reserved.evaluation_run_id,
      idempotent: false,
      claimCount: stored.claims.length,
      findingCount: stored.findings.length,
      actualCostUsd: evaluated.actualCostUsd,
    };
  } catch (error) {
    await supabase.rpc("fail_entity_audit_factual_evaluation", {
      p_evaluation_run_id: reserved.evaluation_run_id,
      p_error_message: error instanceof Error ? error.message : "Falló la evaluación factual.",
    });
    throw error;
  }
}
