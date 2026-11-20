create table public.entity_audit_intervention_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phase smallint not null check (phase between 1 and 7),
  verified_problem text not null check (char_length(verified_problem) between 3 and 2000),
  hypothesis text check (hypothesis is null or char_length(hypothesis) between 3 and 2000),
  suggested_action text not null check (char_length(suggested_action) between 3 and 2000),
  expected_result text not null check (char_length(expected_result) between 3 and 2000),
  review_status text not null default 'draft'
    check (review_status in ('draft', 'approved', 'dismissed')),
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),
  client_visible boolean not null default false,
  client_summary text check (client_summary is null or char_length(client_summary) between 3 and 2000),
  linked_task_id uuid references public.nexaro_tasks(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (not client_visible or (review_status = 'approved' and client_summary is not null)),
  check ((review_status = 'draft' and reviewed_by is null and reviewed_at is null)
    or (review_status <> 'draft' and reviewed_by is not null and reviewed_at is not null)),
  check ((linked_task_id is null and linked_by is null and linked_at is null)
    or (linked_task_id is not null and linked_by is not null and linked_at is not null and review_status = 'approved'))
);

create table public.entity_audit_proposal_findings (
  proposal_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  finding_id uuid not null,
  campaign_id uuid not null references public.entity_audit_campaigns(id) on delete restrict,
  identity_version_id uuid not null references public.entity_identity_versions(id) on delete restrict,
  classification text not null check (classification in ('incorrect', 'unverifiable', 'outdated')),
  verified_fact text not null check (char_length(verified_fact) between 1 and 2000),
  evidence_snapshot text not null check (char_length(evidence_snapshot) between 1 and 2000),
  created_at timestamptz not null default now(),
  primary key (proposal_id, finding_id),
  foreign key (proposal_id, organization_id)
    references public.entity_audit_intervention_proposals(id, organization_id) on delete cascade,
  foreign key (finding_id, organization_id)
    references public.entity_audit_findings(id, organization_id) on delete restrict,
  foreign key (identity_version_id, campaign_id)
    references public.entity_audit_campaigns(identity_version_id, id) on delete restrict
);

create index entity_audit_proposals_org_status_idx
  on public.entity_audit_intervention_proposals (organization_id, review_status, created_at desc);
create index entity_audit_proposal_findings_finding_idx
  on public.entity_audit_proposal_findings (finding_id);

create trigger entity_audit_intervention_proposals_set_updated_at
before update on public.entity_audit_intervention_proposals
for each row execute function private.set_entity_audit_updated_at();

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

create trigger entity_audit_intervention_proposals_enforce_integrity
before insert or update on public.entity_audit_intervention_proposals
for each row execute function private.enforce_entity_audit_proposal_integrity();

create or replace function private.protect_entity_audit_proposal_finding_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'La evidencia de origen de una propuesta es inmutable.';
end;
$$;

create trigger entity_audit_proposal_findings_immutable
before update or delete on public.entity_audit_proposal_findings
for each row execute function private.protect_entity_audit_proposal_finding_history();

create or replace function public.create_entity_audit_intervention_proposal(
  p_organization_id uuid,
  p_created_by uuid,
  p_finding_ids uuid[],
  p_phase smallint,
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
    p_organization_id, p_phase, trim(p_verified_problem), nullif(trim(coalesce(p_hypothesis, '')), ''),
    trim(p_suggested_action), trim(p_expected_result),
    nullif(trim(coalesce(p_internal_note, '')), ''), p_created_by
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
  v_proposal public.entity_audit_intervention_proposals%rowtype;
begin
  if current_user <> 'service_role' and not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede vincular propuestas.';
  end if;
  select * into v_proposal
  from public.entity_audit_intervention_proposals
  where id = p_proposal_id for update;
  if v_proposal.id is null or v_proposal.review_status <> 'approved' then
    raise exception 'La propuesta debe estar aprobada antes de vincularla.';
  end if;
  if v_proposal.linked_task_id is not null then
    raise exception 'La propuesta ya está vinculada a una actuación.';
  end if;
  if not exists (
    select 1 from public.nexaro_tasks task
    where task.id = p_task_id
      and task.organization_id = v_proposal.organization_id
  ) then
    raise exception 'La actuación no pertenece al restaurante.';
  end if;
  update public.entity_audit_intervention_proposals
  set linked_task_id = p_task_id, linked_by = (select auth.uid()), linked_at = now()
  where id = p_proposal_id;
end;
$$;

revoke execute on function public.create_entity_audit_intervention_proposal(
  uuid, uuid, uuid[], smallint, text, text, text, text, text
) from public, anon;
revoke execute on function public.link_entity_audit_proposal_to_task(uuid, uuid) from public, anon;
grant execute on function public.create_entity_audit_intervention_proposal(
  uuid, uuid, uuid[], smallint, text, text, text, text, text
) to authenticated, service_role;
grant execute on function public.link_entity_audit_proposal_to_task(uuid, uuid)
  to authenticated, service_role;

alter table public.entity_audit_intervention_proposals enable row level security;
alter table public.entity_audit_proposal_findings enable row level security;

revoke all on public.entity_audit_intervention_proposals,
  public.entity_audit_proposal_findings from anon, authenticated;
grant select, insert, update, delete on public.entity_audit_intervention_proposals,
  public.entity_audit_proposal_findings to service_role;
grant select, insert, update on public.entity_audit_intervention_proposals,
  public.entity_audit_proposal_findings to authenticated;
revoke select on public.entity_audit_intervention_proposals from authenticated;
grant select (
  id, organization_id, phase, client_summary, review_status, created_at, updated_at
) on public.entity_audit_intervention_proposals to authenticated;
revoke select on public.entity_audit_proposal_findings from authenticated;

create policy "Admins manage Entity Audit intervention proposals"
on public.entity_audit_intervention_proposals for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Members read authorized Entity Audit intervention proposals"
on public.entity_audit_intervention_proposals for select to authenticated
using (
  client_visible
  and review_status = 'approved'
  and exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = entity_audit_intervention_proposals.organization_id
      and membership.user_id = (select auth.uid())
  )
);
create policy "Admins manage Entity Audit proposal findings"
on public.entity_audit_proposal_findings for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));

comment on table public.entity_audit_intervention_proposals is
  'Propuestas manuales derivadas de hallazgos confirmados; no crean tareas ni alteran el progreso.';
comment on table public.entity_audit_proposal_findings is
  'Evidencia inmutable, campaña e identidad de origen de cada hallazgo asociado.';

