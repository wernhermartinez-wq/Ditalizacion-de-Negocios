alter table public.entity_audit_campaigns
  add constraint entity_audit_campaigns_identity_id_key unique (identity_version_id, id);

create table public.entity_audit_evaluation_budgets (
  campaign_id uuid primary key references public.entity_audit_campaigns(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_usd numeric(10, 6) not null default 0.300000 check (budget_usd > 0),
  spent_usd numeric(10, 6) not null default 0 check (spent_usd >= 0),
  reserved_usd numeric(10, 6) not null default 0 check (reserved_usd >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (campaign_id, organization_id)
    references public.entity_audit_campaigns(id, organization_id) on delete cascade
);

create table public.entity_audit_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.entity_audit_campaigns(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_version_id uuid not null references public.entity_identity_versions(id) on delete restrict,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'budget_blocked')),
  model text not null,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 180),
  estimated_cost_usd numeric(10, 6) not null check (estimated_cost_usd >= 0),
  actual_cost_usd numeric(10, 6) check (actual_cost_usd is null or actual_cost_usd >= 0),
  cost_basis text check (cost_basis is null or cost_basis in ('actual', 'estimated')),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  error_message text check (error_message is null or char_length(error_message) <= 1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (campaign_id, organization_id)
    references public.entity_audit_campaigns(id, organization_id) on delete cascade,
  foreign key (identity_version_id, campaign_id)
    references public.entity_audit_campaigns(identity_version_id, id) on delete restrict
);

create unique index entity_audit_evaluation_one_running_idx
  on public.entity_audit_evaluation_runs (campaign_id)
  where status = 'running';
create index entity_audit_evaluation_runs_campaign_idx
  on public.entity_audit_evaluation_runs (campaign_id, created_at desc);

alter table public.entity_audit_evaluation_runs
  add constraint entity_audit_evaluation_runs_id_campaign_org_key
  unique (id, campaign_id, organization_id);

create table public.entity_audit_factual_claims (
  id uuid primary key default gen_random_uuid(),
  evaluation_run_id uuid not null references public.entity_audit_evaluation_runs(id) on delete cascade,
  campaign_id uuid not null references public.entity_audit_campaigns(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  response_id uuid not null references public.visibility_responses(id) on delete restrict,
  provider text not null check (provider in ('openai', 'gemini', 'perplexity')),
  original_response text not null,
  assertion_text text not null check (char_length(assertion_text) between 1 and 2000),
  field_key text not null check (char_length(field_key) between 1 and 80),
  classification text not null
    check (classification in ('correct', 'incorrect', 'unverifiable', 'outdated')),
  evidence_text text not null check (char_length(evidence_text) between 1 and 2000),
  identity_evidence jsonb not null default '{}'::jsonb,
  finding_key text,
  claim_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (evaluation_run_id, claim_fingerprint),
  foreign key (evaluation_run_id, campaign_id, organization_id)
    references public.entity_audit_evaluation_runs(id, campaign_id, organization_id) on delete cascade
);

create table public.entity_audit_findings (
  id uuid primary key default gen_random_uuid(),
  evaluation_run_id uuid not null references public.entity_audit_evaluation_runs(id) on delete cascade,
  campaign_id uuid not null references public.entity_audit_campaigns(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  finding_key text not null check (char_length(finding_key) between 1 and 180),
  field_key text not null check (char_length(field_key) between 1 and 80),
  classification text not null check (classification in ('incorrect', 'unverifiable', 'outdated')),
  summary text not null check (char_length(summary) between 1 and 2000),
  evidence_summary text not null check (char_length(evidence_summary) between 1 and 2000),
  provider_count integer not null default 1 check (provider_count > 0),
  response_count integer not null default 1 check (response_count > 0),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'confirmed', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_run_id, finding_key),
  unique (id, organization_id),
  foreign key (evaluation_run_id, campaign_id, organization_id)
    references public.entity_audit_evaluation_runs(id, campaign_id, organization_id) on delete cascade
);

create table public.entity_audit_finding_reviews (
  finding_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  foreign key (finding_id, organization_id)
    references public.entity_audit_findings(id, organization_id) on delete cascade
);

create trigger entity_audit_evaluation_budgets_set_updated_at
before update on public.entity_audit_evaluation_budgets
for each row execute function private.set_entity_audit_updated_at();

create or replace function private.protect_entity_audit_evaluation_budget()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.budget_usd is distinct from old.budget_usd
    and new.budget_usd < old.spent_usd + old.reserved_usd then
    raise exception 'El presupuesto no puede ser inferior al consumo registrado o reservado.';
  end if;
  return new;
end;
$$;

create trigger entity_audit_evaluation_budgets_protect_limit
before update of budget_usd on public.entity_audit_evaluation_budgets
for each row execute function private.protect_entity_audit_evaluation_budget();

create trigger entity_audit_findings_set_updated_at
before update on public.entity_audit_findings
for each row execute function private.set_entity_audit_updated_at();

create or replace function private.enforce_entity_audit_claim_response()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.entity_audit_campaigns campaign
    join public.visibility_runs run on run.id = campaign.visibility_run_id
    join public.visibility_responses response on response.run_id = run.id
    where campaign.id = new.campaign_id
      and campaign.organization_id = new.organization_id
      and response.id = new.response_id
      and response.provider = new.provider
      and response.original_response = new.original_response
  ) then
    raise exception 'La afirmación debe reutilizar una respuesta original de la misma campaña.';
  end if;
  return new;
end;
$$;

create trigger entity_audit_factual_claims_enforce_response
before insert or update on public.entity_audit_factual_claims
for each row execute function private.enforce_entity_audit_claim_response();

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
  where id = p_campaign_id for update;
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

create or replace function public.fail_entity_audit_factual_evaluation(
  p_evaluation_run_id uuid,
  p_error_message text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run public.entity_audit_evaluation_runs%rowtype;
begin
  if current_user <> 'service_role' and not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede cerrar la evaluación factual.';
  end if;
  select * into v_run from public.entity_audit_evaluation_runs
  where id = p_evaluation_run_id for update;
  if v_run.id is null or v_run.status <> 'running' then return; end if;
  update public.entity_audit_evaluation_budgets
  set reserved_usd = greatest(0, reserved_usd - v_run.estimated_cost_usd),
      spent_usd = spent_usd + v_run.estimated_cost_usd,
      updated_by = v_run.created_by
  where campaign_id = v_run.campaign_id;
  update public.entity_audit_evaluation_runs
  set status = 'failed', actual_cost_usd = estimated_cost_usd,
      cost_basis = 'estimated', error_message = left(p_error_message, 1000),
      completed_at = now()
  where id = v_run.id;
end;
$$;

revoke execute on function public.reserve_entity_audit_factual_evaluation(uuid, text, numeric, text, uuid) from public, anon;
revoke execute on function public.complete_entity_audit_factual_evaluation(uuid, numeric, integer, integer, jsonb, jsonb) from public, anon;
revoke execute on function public.fail_entity_audit_factual_evaluation(uuid, text) from public, anon;
grant execute on function public.reserve_entity_audit_factual_evaluation(uuid, text, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.complete_entity_audit_factual_evaluation(uuid, numeric, integer, integer, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.fail_entity_audit_factual_evaluation(uuid, text) to authenticated, service_role;

alter table public.entity_audit_evaluation_budgets enable row level security;
alter table public.entity_audit_evaluation_runs enable row level security;
alter table public.entity_audit_factual_claims enable row level security;
alter table public.entity_audit_findings enable row level security;
alter table public.entity_audit_finding_reviews enable row level security;

revoke all on public.entity_audit_evaluation_budgets, public.entity_audit_evaluation_runs,
  public.entity_audit_factual_claims, public.entity_audit_findings,
  public.entity_audit_finding_reviews from anon, authenticated;
grant select, insert, update on public.entity_audit_evaluation_budgets,
  public.entity_audit_evaluation_runs, public.entity_audit_factual_claims,
  public.entity_audit_findings, public.entity_audit_finding_reviews to authenticated;
revoke select on public.entity_audit_findings from authenticated;
grant select (
  id, campaign_id, organization_id, field_key, classification, summary,
  evidence_summary, provider_count, response_count, review_status, created_at, updated_at
) on public.entity_audit_findings to authenticated;
grant select, insert, update, delete on public.entity_audit_evaluation_budgets,
  public.entity_audit_evaluation_runs, public.entity_audit_factual_claims,
  public.entity_audit_findings, public.entity_audit_finding_reviews to service_role;

create policy "Admins manage factual evaluation budgets"
on public.entity_audit_evaluation_budgets for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Admins manage factual evaluation runs"
on public.entity_audit_evaluation_runs for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Admins manage factual claims"
on public.entity_audit_factual_claims for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Admins manage Entity Audit findings"
on public.entity_audit_findings for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Members read confirmed Entity Audit findings"
on public.entity_audit_findings for select to authenticated
using (
  review_status = 'confirmed'
  and exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = entity_audit_findings.organization_id
      and membership.user_id = (select auth.uid())
  )
);
create policy "Admins manage factual finding reviews"
on public.entity_audit_finding_reviews for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));

comment on table public.entity_audit_factual_claims is
  'Afirmaciones extraídas de respuestas ya registradas y contrastadas con la identidad versionada.';
comment on table public.entity_audit_findings is
  'Hallazgos factuales agrupados; sólo los confirmados son visibles para el restaurante.';
comment on table public.entity_audit_finding_reviews is
  'Notas internas de revisión Nexaro, nunca accesibles a miembros del restaurante.';
