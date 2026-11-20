-- Corrective migration for the local acceptance failures in Entity Audit deliveries 2-4.
-- It deliberately keeps SECURITY INVOKER and does not broaden authenticated table access.

create or replace function public.prepare_entity_audit_campaign(
  p_organization_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case public.entity_audit_cases%rowtype;
  v_identity public.entity_identity_versions%rowtype;
  v_standard_set_id uuid;
  v_custom_set_id uuid;
  v_project_id uuid;
  v_campaign_id uuid;
  v_campaign_number integer;
  v_month_count integer;
  v_question record;
  v_prompt_id uuid;
  v_position integer := 0;
  v_rendered text;
  v_city text;
  v_category text;
  v_specialty text;
  v_prompt_ids uuid[] := '{}';
begin
  if not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede preparar una campaña Entity Audit.';
  end if;
  if char_length(p_idempotency_key) not between 8 and 180 then
    raise exception 'Clave de idempotencia no válida.';
  end if;

  select audit_case.id, audit_case.status, audit_case.current_identity_version_id
  into v_case.id, v_case.status, v_case.current_identity_version_id
  from public.entity_audit_cases as audit_case
  where audit_case.organization_id = p_organization_id for update;
  if v_case.id is null or v_case.status <> 'ready' or v_case.current_identity_version_id is null then
    raise exception 'La identidad comercial debe estar validada antes de medir.';
  end if;

  select identity.id, identity.case_id, identity.commercial_name, identity.name_variants,
         identity.domain, identity.city, identity.region, identity.country_code,
         identity.categories, identity.specialties, identity.services
  into v_identity.id, v_identity.case_id, v_identity.commercial_name, v_identity.name_variants,
       v_identity.domain, v_identity.city, v_identity.region, v_identity.country_code,
       v_identity.categories, v_identity.specialties, v_identity.services
  from public.entity_identity_versions as identity
  where identity.id = v_case.current_identity_version_id
    and identity.case_id = v_case.id and identity.status = 'validated';
  if v_identity.id is null then
    raise exception 'La campaña debe referenciar una identidad validada.';
  end if;
  if coalesce(v_identity.domain, '') = '' then
    raise exception 'La identidad validada necesita un dominio para usar el motor de visibilidad.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('entity-campaign-' || p_organization_id::text, 0));
  select id into v_campaign_id from public.entity_audit_campaigns
  where idempotency_key = p_idempotency_key;
  if v_campaign_id is not null then
    return jsonb_build_object(
      'campaign_id', v_campaign_id,
      'project_id', (select visibility_project_id from public.entity_audit_campaigns where id = v_campaign_id),
      'identity_version_id', (select identity_version_id from public.entity_audit_campaigns where id = v_campaign_id),
      'prompt_ids', (select coalesce(jsonb_agg(visibility_prompt_id order by position), '[]'::jsonb)
                     from public.entity_audit_campaign_questions where campaign_id = v_campaign_id)
    );
  end if;

  select count(*) into v_month_count from public.entity_audit_campaigns
  where case_id = v_case.id
    and status in ('prepared', 'running', 'completed', 'partial')
    and created_at >= date_trunc('month', now())
    and created_at < date_trunc('month', now()) + interval '1 month';
  if v_month_count >= 2 then
    raise exception 'El piloto permite un máximo de 2 campañas completas al mes.';
  end if;

  select id into v_standard_set_id from public.entity_audit_question_sets
  where set_type = 'standard' order by version_number desc limit 1;
  select id into v_custom_set_id from public.entity_audit_question_sets
  where set_type = 'custom' and organization_id = p_organization_id
  order by version_number desc limit 1;

  select project.id into v_project_id
  from public.visibility_projects as project
  where project.organization_id = p_organization_id;
  if v_project_id is null then
    insert into public.visibility_projects (
      organization_id, brand_name, brand_variants, domain, services, business_description,
      country, region, primary_language, status, schedule_frequency, settings, created_by
    ) values (
      p_organization_id, v_identity.commercial_name, v_identity.name_variants, v_identity.domain,
      v_identity.services, array_to_string(v_identity.categories, ', '), v_identity.country_code,
      coalesce(v_identity.city, v_identity.region), 'es', 'active', 'manual',
      '{"max_competitors":10,"max_active_prompts":100,"entity_audit":true}'::jsonb,
      (select auth.uid())
    ) returning id into v_project_id;
  end if;

  select coalesce(max(campaign_number), 0) + 1 into v_campaign_number
  from public.entity_audit_campaigns where case_id = v_case.id;
  insert into public.entity_audit_campaigns (
    case_id, organization_id, identity_version_id, standard_question_set_id,
    custom_question_set_id, visibility_project_id, campaign_number,
    idempotency_key, created_by
  ) values (
    v_case.id, p_organization_id, v_identity.id, v_standard_set_id,
    v_custom_set_id, v_project_id, v_campaign_number, p_idempotency_key, (select auth.uid())
  ) returning id into v_campaign_id;

  v_city := coalesce(nullif(v_identity.city, ''), nullif(v_identity.region, ''), 'su zona');
  v_category := coalesce(v_identity.categories[1], 'restaurantes');
  v_specialty := coalesce(v_identity.specialties[1], v_identity.categories[1], 'comida');
  for v_question in
    select q.*, s.set_type
    from public.entity_audit_questions q
    join public.entity_audit_question_sets s on s.id = q.question_set_id
    where q.question_set_id = v_standard_set_id or q.question_set_id = v_custom_set_id
    order by case when s.set_type = 'standard' then 0 else 1 end, q.position
  loop
    v_position := v_position + 1;
    v_prompt_id := null;
    v_rendered := replace(replace(replace(replace(
      v_question.prompt_template,
      '{city}', v_city), '{category}', v_category), '{specialty}', v_specialty),
      '{name}', v_identity.commercial_name);
    insert into public.visibility_prompts (
      project_id, question, country, language, status, active, created_by,
      approved_by, approved_at, entity_audit_question_id, entity_identity_version_id
    ) values (
      v_project_id, v_rendered, v_question.country, v_question.language, 'approved', true,
      (select auth.uid()), (select auth.uid()), now(), v_question.id, v_identity.id
    )
    on conflict (project_id, entity_audit_question_id, entity_identity_version_id)
      where entity_audit_question_id is not null
    do nothing
    returning id into v_prompt_id;
    if v_prompt_id is null then
      select prompt.id into v_prompt_id
      from public.visibility_prompts as prompt
      where prompt.project_id = v_project_id
        and prompt.entity_audit_question_id = v_question.id
        and prompt.entity_identity_version_id = v_identity.id;
    end if;
    insert into public.entity_audit_campaign_questions (
      campaign_id, source_question_id, visibility_prompt_id, position,
      source_type, category, question_text
    ) values (
      v_campaign_id, v_question.id, v_prompt_id, v_position,
      v_question.set_type, v_question.category, v_rendered
    );
    v_prompt_ids := array_append(v_prompt_ids, v_prompt_id);
  end loop;

  if v_position < 10 or v_position > 15 or v_position * 3 > 45 then
    raise exception 'La campaña debe contener entre 10 y 15 preguntas y no superar 45 consultas.';
  end if;
  return jsonb_build_object(
    'campaign_id', v_campaign_id,
    'project_id', v_project_id,
    'identity_version_id', v_identity.id,
    'prompt_ids', to_jsonb(v_prompt_ids)
  );
end;
$$;

create or replace function public.reserve_entity_audit_factual_evaluation(
  p_campaign_id uuid,
  p_idempotency_key text,
  p_estimated_cost_usd numeric,
  p_model text,
  p_created_by uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_campaign public.entity_audit_campaigns%rowtype;
  v_budget public.entity_audit_evaluation_budgets%rowtype;
  v_run_id uuid;
begin
  if current_user <> 'service_role' and not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede iniciar la evaluación factual.';
  end if;
  if char_length(p_idempotency_key) not between 8 and 180
    or p_estimated_cost_usd <= 0 or char_length(trim(p_model)) < 2 then
    raise exception 'Parámetros de evaluación no válidos.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('entity-factual-' || p_campaign_id::text, 0));
  select * into v_campaign from public.entity_audit_campaigns
  where id = p_campaign_id;
  if v_campaign.id is null or v_campaign.status not in ('completed', 'partial')
    or v_campaign.visibility_run_id is null then
    raise exception 'La campaña debe tener respuestas registradas antes de evaluarse.';
  end if;
  if not exists (
    select 1 from public.entity_identity_versions identity
    where identity.id = v_campaign.identity_version_id
      and identity.status in ('validated', 'superseded')
  ) then
    raise exception 'La identidad versionada de la campaña no es válida.';
  end if;
  if not exists (
    select 1 from public.visibility_responses response
    where response.run_id = v_campaign.visibility_run_id
      and response.status = 'completed' and response.original_response is not null
  ) then
    raise exception 'La campaña no contiene respuestas completas para evaluar.';
  end if;

  select id into v_run_id from public.entity_audit_evaluation_runs
  where idempotency_key = p_idempotency_key;
  if v_run_id is not null then
    return jsonb_build_object('evaluation_run_id', v_run_id, 'idempotent', true);
  end if;

  insert into public.entity_audit_evaluation_budgets (
    campaign_id, organization_id, updated_by
  ) values (
    v_campaign.id, v_campaign.organization_id, p_created_by
  ) on conflict (campaign_id) do nothing;

  select * into v_budget from public.entity_audit_evaluation_budgets
  where campaign_id = v_campaign.id for update;
  if exists (
    select 1 from public.entity_audit_evaluation_runs
    where campaign_id = v_campaign.id and status = 'running'
  ) then
    raise exception 'Ya existe una evaluación factual en ejecución para esta campaña.';
  end if;
  if v_budget.spent_usd >= v_budget.budget_usd
    or v_budget.spent_usd + v_budget.reserved_usd + p_estimated_cost_usd > v_budget.budget_usd then
    raise exception 'La estimación supera el presupuesto restante de la campaña.';
  end if;

  insert into public.entity_audit_evaluation_runs (
    campaign_id, organization_id, identity_version_id, model, idempotency_key,
    estimated_cost_usd, created_by
  ) values (
    v_campaign.id, v_campaign.organization_id, v_campaign.identity_version_id,
    trim(p_model), p_idempotency_key, p_estimated_cost_usd, p_created_by
  ) returning id into v_run_id;
  update public.entity_audit_evaluation_budgets
  set reserved_usd = reserved_usd + p_estimated_cost_usd,
      updated_by = p_created_by
  where campaign_id = v_campaign.id;
  return jsonb_build_object('evaluation_run_id', v_run_id, 'idempotent', false);
end;
$$;

drop function public.create_entity_audit_intervention_proposal(
  uuid, uuid, uuid[], smallint, text, text, text, text, text
);

create function public.create_entity_audit_intervention_proposal(
  p_organization_id uuid,
  p_created_by uuid,
  p_finding_ids uuid[],
  p_phase integer,
  p_verified_problem text,
  p_hypothesis text,
  p_suggested_action text,
  p_expected_result text,
  p_internal_note text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_proposal_id uuid;
  v_requested_count integer;
  v_confirmed_count integer;
begin
  if current_user <> 'service_role' and not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede crear propuestas de intervención.';
  end if;
  if p_created_by is null
    or (current_user <> 'service_role' and p_created_by <> (select auth.uid())) then
    raise exception 'El autor de la propuesta no coincide con la sesión administrativa.';
  end if;
  if p_phase not between 1 and 7
    or char_length(trim(coalesce(p_verified_problem, ''))) < 3
    or char_length(trim(coalesce(p_suggested_action, ''))) < 3
    or char_length(trim(coalesce(p_expected_result, ''))) < 3 then
    raise exception 'La propuesta no contiene todos los datos obligatorios.';
  end if;

  v_requested_count := coalesce(array_length(p_finding_ids, 1), 0);
  if v_requested_count = 0 or v_requested_count <> (
    select count(distinct item) from unnest(p_finding_ids) item
  ) then
    raise exception 'Selecciona uno o varios hallazgos confirmados sin duplicados.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('entity-proposal-' || p_organization_id::text, 0));
  select count(*) into v_confirmed_count
  from public.entity_audit_findings finding
  where finding.id = any(p_finding_ids)
    and finding.organization_id = p_organization_id
    and finding.review_status = 'confirmed';
  if v_confirmed_count <> v_requested_count then
    raise exception 'Todos los hallazgos deben estar confirmados y pertenecer al restaurante.';
  end if;

  insert into public.entity_audit_intervention_proposals (
    organization_id, phase, verified_problem, hypothesis, suggested_action,
    expected_result, internal_note, created_by
  ) values (
    p_organization_id, p_phase::smallint, trim(p_verified_problem),
    nullif(trim(coalesce(p_hypothesis, '')), ''), trim(p_suggested_action),
    trim(p_expected_result), nullif(trim(coalesce(p_internal_note, '')), ''), p_created_by
  ) returning id into v_proposal_id;

  insert into public.entity_audit_proposal_findings (
    proposal_id, organization_id, finding_id, campaign_id, identity_version_id,
    classification, verified_fact, evidence_snapshot
  )
  select v_proposal_id, finding.organization_id, finding.id, finding.campaign_id,
    campaign.identity_version_id, finding.classification, finding.summary,
    finding.evidence_summary
  from public.entity_audit_findings finding
  join public.entity_audit_campaigns campaign on campaign.id = finding.campaign_id
  where finding.id = any(p_finding_ids);

  return v_proposal_id;
end;
$$;

revoke execute on function public.create_entity_audit_intervention_proposal(
  uuid, uuid, uuid[], integer, text, text, text, text, text
) from public, anon;
grant execute on function public.create_entity_audit_intervention_proposal(
  uuid, uuid, uuid[], integer, text, text, text, text, text
) to authenticated, service_role;

create or replace function private.enforce_entity_audit_proposal_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.linked_task_id is not null and not exists (
    select 1 from public.nexaro_tasks task
    where task.id = new.linked_task_id
      and task.organization_id = new.organization_id
  ) then
    raise exception 'La actuación vinculada no pertenece al restaurante.';
  end if;
  if tg_op = 'UPDATE' and old.linked_task_id is not null
    and new.linked_task_id is distinct from old.linked_task_id then
    raise exception 'La propuesta ya está vinculada a una actuación.';
  end if;
  if tg_op = 'UPDATE' and old.review_status <> 'draft' and (
    new.organization_id is distinct from old.organization_id
    or new.phase is distinct from old.phase
    or new.verified_problem is distinct from old.verified_problem
    or new.hypothesis is distinct from old.hypothesis
    or new.suggested_action is distinct from old.suggested_action
    or new.expected_result is distinct from old.expected_result
  ) then
    raise exception 'El contenido de una propuesta revisada es inmutable.';
  end if;
  return new;
end;
$$;

create or replace function public.link_entity_audit_proposal_to_task(
  p_proposal_id uuid,
  p_task_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_proposal_id uuid;
  v_organization_id uuid;
  v_review_status text;
begin
  if current_user <> 'service_role' and not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede vincular propuestas.';
  end if;

  select id, organization_id, review_status
  into v_proposal_id, v_organization_id, v_review_status
  from public.entity_audit_intervention_proposals
  where id = p_proposal_id;
  if v_proposal_id is null or v_review_status <> 'approved' then
    raise exception 'La propuesta debe estar aprobada antes de vincularla.';
  end if;
  if not exists (
    select 1 from public.nexaro_tasks task
    where task.id = p_task_id and task.organization_id = v_organization_id
  ) then
    raise exception 'La actuación no pertenece al restaurante.';
  end if;

  update public.entity_audit_intervention_proposals
  set linked_task_id = p_task_id, linked_by = (select auth.uid()), linked_at = now()
  where id = p_proposal_id;
end;
$$;
