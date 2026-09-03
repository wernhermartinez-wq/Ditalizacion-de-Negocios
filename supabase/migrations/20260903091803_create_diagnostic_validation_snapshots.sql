alter table public.diagnostics
  add column validated_at timestamptz,
  add column validated_by uuid references auth.users(id) on delete restrict;

alter table public.diagnostics drop constraint diagnostics_status_check;
alter table public.diagnostics drop constraint diagnostics_check;
alter table public.diagnostics
  add constraint diagnostics_status_check check (status in ('draft', 'completed', 'validated')),
  add constraint diagnostics_lifecycle_check check (
    (status = 'draft' and completed_at is null and validated_at is null and validated_by is null)
    or (status = 'completed' and completed_at is not null and validated_at is null and validated_by is null)
    or (status = 'validated' and completed_at is not null and validated_at is not null and validated_by is not null)
  );

create index diagnostics_validated_by_idx on public.diagnostics (validated_by);

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.diagnostics(id) on delete cascade,
  dimension_id text not null,
  score numeric(5,2) check (score between 0 and 100),
  nivel text not null,
  tipo_resultado text not null check (tipo_resultado in ('calculado', 'sin_evaluar')),
  formula_version text not null,
  created_at timestamptz not null default now(),
  unique (assessment_id, dimension_id),
  check (
    (tipo_resultado = 'sin_evaluar' and score is null and nivel = 'Sin evaluar')
    or (tipo_resultado = 'calculado' and score is not null)
  )
);

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.diagnostics(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  formula_version text not null,
  validated_by uuid not null references auth.users(id) on delete restrict,
  validated_at timestamptz not null default now()
);

create index roadmaps_organization_validated_idx
  on public.roadmaps (organization_id, validated_at desc);
create index roadmaps_validated_by_idx on public.roadmaps (validated_by);

create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  dimension_id text not null,
  dimension_name text not null,
  code text not null,
  color text not null,
  score numeric(5,2) not null check (score between 0 and 100),
  phase smallint not null check (phase between 1 and 3),
  period text not null,
  priority text not null check (priority in ('Alta', 'Media', 'Programada')),
  title text not null,
  objective text not null,
  actions jsonb not null check (jsonb_typeof(actions) = 'array'),
  success text not null,
  weaknesses jsonb not null check (jsonb_typeof(weaknesses) = 'array'),
  position smallint not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (roadmap_id, position),
  unique (roadmap_id, code)
);

create index roadmap_items_roadmap_idx on public.roadmap_items (roadmap_id, position);

alter table public.assessment_scores enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_items enable row level security;

create policy "Members and admins read assessment score snapshots"
on public.assessment_scores for select to authenticated
using (
  (select private.is_platform_admin())
  or exists (
    select 1
    from public.diagnostics diagnostic
    join public.organization_memberships membership
      on membership.organization_id = diagnostic.organization_id
    where diagnostic.id = assessment_scores.assessment_id
      and membership.user_id = (select auth.uid())
  )
);

create policy "Admins insert assessment score snapshots"
on public.assessment_scores for insert to authenticated
with check ((select private.is_platform_admin()));

create policy "Members and admins read roadmap snapshots"
on public.roadmaps for select to authenticated
using (
  (select private.is_platform_admin())
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = roadmaps.organization_id
      and membership.user_id = (select auth.uid())
  )
);

create policy "Admins insert roadmap snapshots"
on public.roadmaps for insert to authenticated
with check (
  validated_by = (select auth.uid())
  and (select private.is_platform_admin())
);

create policy "Members and admins read roadmap item snapshots"
on public.roadmap_items for select to authenticated
using (
  exists (
    select 1 from public.roadmaps roadmap
    where roadmap.id = roadmap_items.roadmap_id
  )
);

create policy "Admins insert roadmap item snapshots"
on public.roadmap_items for insert to authenticated
with check ((select private.is_platform_admin()));

revoke all on public.assessment_scores, public.roadmaps, public.roadmap_items from public, anon, authenticated;
grant select, insert on public.assessment_scores, public.roadmaps, public.roadmap_items to authenticated;

create or replace function private.reject_snapshot_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Validated diagnostic snapshots are immutable';
end;
$$;

revoke all on function private.reject_snapshot_mutation() from public, anon, authenticated;

create trigger assessment_scores_are_immutable
before update or delete on public.assessment_scores
for each row execute function private.reject_snapshot_mutation();

create trigger roadmaps_are_immutable
before update or delete on public.roadmaps
for each row execute function private.reject_snapshot_mutation();

create trigger roadmap_items_are_immutable
before update or delete on public.roadmap_items
for each row execute function private.reject_snapshot_mutation();

create or replace function private.enforce_diagnostic_validation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'validated' and (
    new.status is distinct from old.status
    or new.validated_at is distinct from old.validated_at
    or new.validated_by is distinct from old.validated_by
    or new.provisional_score is distinct from old.provisional_score
  ) then
    raise exception 'Validated diagnostics cannot be changed';
  end if;

  if new.status = 'validated' and old.status <> 'validated' then
    if new.validated_by is distinct from (select auth.uid())
      or not (select private.is_platform_admin()) then
      raise exception 'Only a platform administrator can validate a diagnostic';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_diagnostic_validation() from public, anon, authenticated;

create trigger enforce_diagnostic_validation_before_update
before update on public.diagnostics
for each row execute function private.enforce_diagnostic_validation();

create policy "Admins update diagnostics for validation"
on public.diagnostics for update to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));

grant update (validated_at, validated_by) on public.diagnostics to authenticated;

create or replace function public.validate_diagnostic_snapshot(
  p_diagnostic_id uuid,
  p_formula_version text,
  p_scores jsonb,
  p_roadmap jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_roadmap_id uuid;
begin
  if v_user_id is null or not (select private.is_platform_admin()) then
    raise exception 'Not authorized';
  end if;

  if nullif(trim(p_formula_version), '') is null
    or jsonb_typeof(p_scores) <> 'array'
    or jsonb_typeof(p_roadmap) <> 'array' then
    raise exception 'Invalid snapshot payload';
  end if;

  select diagnostic.organization_id
  into v_organization_id
  from public.diagnostics diagnostic
  where diagnostic.id = p_diagnostic_id
    and diagnostic.status = 'completed'
  for update;

  if v_organization_id is null then
    raise exception 'Diagnostic is not pending validation';
  end if;

  if exists (select 1 from public.assessment_scores score where score.assessment_id = p_diagnostic_id)
    or exists (select 1 from public.roadmaps roadmap where roadmap.assessment_id = p_diagnostic_id) then
    raise exception 'Diagnostic snapshot already exists';
  end if;

  insert into public.assessment_scores (
    assessment_id, dimension_id, score, nivel, tipo_resultado, formula_version
  )
  select
    p_diagnostic_id,
    item.dimension_id,
    item.score,
    item.nivel,
    item.tipo_resultado,
    p_formula_version
  from jsonb_to_recordset(p_scores) as item(
    dimension_id text,
    score numeric,
    nivel text,
    tipo_resultado text
  );

  if (select count(*) from public.assessment_scores score where score.assessment_id = p_diagnostic_id) <> 6 then
    raise exception 'A snapshot must contain all six dimensions';
  end if;

  insert into public.roadmaps (
    assessment_id, organization_id, formula_version, validated_by
  ) values (
    p_diagnostic_id, v_organization_id, p_formula_version, v_user_id
  ) returning id into v_roadmap_id;

  insert into public.roadmap_items (
    roadmap_id, dimension_id, dimension_name, code, color, score, phase,
    period, priority, title, objective, actions, success, weaknesses, position
  )
  select
    v_roadmap_id,
    item.dimension_id,
    item.dimension_name,
    item.code,
    item.color,
    item.score,
    item.phase,
    item.period,
    item.priority,
    item.title,
    item.objective,
    item.actions,
    item.success,
    item.weaknesses,
    item.position
  from jsonb_to_recordset(p_roadmap) as item(
    dimension_id text,
    dimension_name text,
    code text,
    color text,
    score numeric,
    phase smallint,
    period text,
    priority text,
    title text,
    objective text,
    actions jsonb,
    success text,
    weaknesses jsonb,
    position smallint
  );

  update public.diagnostics
  set status = 'validated',
      validated_at = now(),
      validated_by = v_user_id,
      updated_at = now()
  where id = p_diagnostic_id;
end;
$$;

revoke all on function public.validate_diagnostic_snapshot(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.validate_diagnostic_snapshot(uuid, text, jsonb, jsonb) to authenticated;

drop policy "Only Nexaro admins can complete roadmap tasks" on public.roadmap_task_completions;
create policy "Only Nexaro admins can complete roadmap tasks"
on public.roadmap_task_completions for insert to authenticated
with check (
  completed_by = (select auth.uid())
  and (select private.is_platform_admin())
  and exists (
    select 1 from public.diagnostics diagnostic
    where diagnostic.id = roadmap_task_completions.diagnostic_id
      and diagnostic.organization_id = roadmap_task_completions.organization_id
      and diagnostic.status = 'validated'
  )
);
