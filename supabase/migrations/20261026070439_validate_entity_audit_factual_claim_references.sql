create or replace function public.complete_entity_audit_factual_evaluation(
  p_evaluation_run_id uuid,
  p_actual_cost_usd numeric,
  p_input_tokens integer,
  p_output_tokens integer,
  p_claims jsonb,
  p_findings jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run public.entity_audit_evaluation_runs%rowtype;
  v_expected_claims integer;
  v_inserted_claims integer;
begin
  if current_user <> 'service_role' and not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede completar la evaluación factual.';
  end if;
  if p_actual_cost_usd < 0 or p_input_tokens < 0 or p_output_tokens < 0
    or jsonb_typeof(p_claims) <> 'array' or jsonb_typeof(p_findings) <> 'array' then
    raise exception 'Resultado factual no válido.';
  end if;

  select * into v_run from public.entity_audit_evaluation_runs
  where id = p_evaluation_run_id for update;
  if v_run.id is null or v_run.status <> 'running' then
    raise exception 'La evaluación no está disponible para completarse.';
  end if;

  v_expected_claims := jsonb_array_length(p_claims);
  insert into public.entity_audit_factual_claims (
    evaluation_run_id, campaign_id, organization_id, response_id, provider,
    original_response, assertion_text, field_key, classification, evidence_text,
    identity_evidence, finding_key, claim_fingerprint
  )
  select v_run.id, v_run.campaign_id, v_run.organization_id, item.response_id,
    item.provider, response.original_response, item.assertion_text, item.field_key,
    item.classification, item.evidence_text, item.identity_evidence,
    item.finding_key, item.claim_fingerprint
  from jsonb_to_recordset(p_claims) as item(
    response_id uuid, provider text, assertion_text text, field_key text,
    classification text, evidence_text text, identity_evidence jsonb,
    finding_key text, claim_fingerprint text
  )
  join public.visibility_responses response on response.id = item.response_id;
  get diagnostics v_inserted_claims = row_count;
  if v_inserted_claims <> v_expected_claims then
    raise exception 'Todas las afirmaciones deben reutilizar respuestas originales existentes.';
  end if;

  insert into public.entity_audit_findings (
    evaluation_run_id, campaign_id, organization_id, finding_key, field_key,
    classification, summary, evidence_summary, provider_count, response_count
  )
  select v_run.id, v_run.campaign_id, v_run.organization_id, item.finding_key,
    item.field_key, item.classification, item.summary, item.evidence_summary,
    item.provider_count, item.response_count
  from jsonb_to_recordset(p_findings) as item(
    finding_key text, field_key text, classification text, summary text,
    evidence_summary text, provider_count integer, response_count integer
  );

  update public.entity_audit_evaluation_budgets
  set reserved_usd = greatest(0, reserved_usd - v_run.estimated_cost_usd),
      spent_usd = spent_usd + p_actual_cost_usd,
      updated_by = v_run.created_by
  where campaign_id = v_run.campaign_id;
  update public.entity_audit_evaluation_runs
  set status = 'completed', actual_cost_usd = p_actual_cost_usd,
      cost_basis = 'actual', input_tokens = p_input_tokens,
      output_tokens = p_output_tokens, completed_at = now()
  where id = v_run.id;
end;
$$;
