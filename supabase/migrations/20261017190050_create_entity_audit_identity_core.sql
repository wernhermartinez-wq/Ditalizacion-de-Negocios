create table public.entity_audit_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  status text not null default 'identity_pending'
    check (status in ('identity_pending', 'ready', 'paused', 'closed')),
  activation_source text not null
    check (activation_source in ('subscription', 'admin')),
  activated_by uuid references auth.users(id) on delete set null,
  current_identity_version_id uuid,
  activated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entity_identity_versions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.entity_audit_cases(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'validated', 'superseded')),
  commercial_name text not null,
  legal_name text,
  name_variants text[] not null default '{}',
  website_url text,
  domain text,
  address_line_1 text,
  address_line_2 text,
  postal_code text,
  city text,
  region text,
  country_code text not null default 'ES',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  phone text,
  opening_hours jsonb not null default '{}'::jsonb,
  categories text[] not null default '{}',
  specialties text[] not null default '{}',
  services text[] not null default '{}',
  menu_url text,
  reservation_url text,
  contact_url text,
  official_profiles jsonb not null default '[]'::jsonb,
  external_identifiers jsonb not null default '{}'::jsonb,
  validation_note text,
  validated_by uuid references auth.users(id) on delete restrict,
  validated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, version_number),
  unique (id, case_id),
  check (
    (status = 'draft' and validated_by is null and validated_at is null)
    or (status in ('validated', 'superseded') and validated_by is not null and validated_at is not null)
  )
);

alter table public.entity_audit_cases
  add constraint entity_audit_cases_current_identity_version_fkey
  foreign key (current_identity_version_id)
  references public.entity_identity_versions(id)
  on delete restrict
  deferrable initially deferred;

alter table public.entity_audit_cases
  add constraint entity_audit_cases_current_identity_belongs_to_case_fkey
  foreign key (current_identity_version_id, id)
  references public.entity_identity_versions(id, case_id)
  on delete restrict
  deferrable initially deferred;

create table public.entity_sources (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.entity_audit_cases(id) on delete cascade,
  source_type text not null
    check (source_type in ('restaurant', 'website', 'google_business', 'directory', 'social', 'reservation', 'menu', 'other')),
  name text not null,
  url text,
  external_identifier text,
  status text not null default 'active'
    check (status in ('active', 'unavailable', 'obsolete')),
  last_checked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entity_sources add constraint entity_sources_id_case_key unique (id, case_id);

create table public.entity_observations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.entity_audit_cases(id) on delete cascade,
  source_id uuid references public.entity_sources(id) on delete restrict,
  field_key text not null,
  observation_kind text not null
    check (observation_kind in ('declared', 'observed')),
  value jsonb not null,
  normalized_value jsonb,
  status text not null default 'unreviewed'
    check (status in ('unreviewed', 'confirmed', 'rejected', 'superseded')),
  internal_note text,
  observed_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entity_observations
  add constraint entity_observations_source_belongs_to_case_fkey
  foreign key (source_id, case_id)
  references public.entity_sources(id, case_id)
  on delete restrict;

create unique index entity_identity_versions_one_draft_per_case_idx
  on public.entity_identity_versions (case_id)
  where status = 'draft';

create unique index entity_identity_versions_one_validated_per_case_idx
  on public.entity_identity_versions (case_id)
  where status = 'validated';

create index entity_identity_versions_case_history_idx
  on public.entity_identity_versions (case_id, version_number desc);
create index entity_sources_case_idx on public.entity_sources (case_id);
create index entity_observations_case_idx on public.entity_observations (case_id, observed_at desc);
create index entity_observations_source_idx on public.entity_observations (source_id);

create or replace function private.set_entity_audit_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entity_audit_cases_set_updated_at
before update on public.entity_audit_cases
for each row execute function private.set_entity_audit_updated_at();
create trigger entity_identity_versions_set_updated_at
before update on public.entity_identity_versions
for each row execute function private.set_entity_audit_updated_at();
create trigger entity_sources_set_updated_at
before update on public.entity_sources
for each row execute function private.set_entity_audit_updated_at();
create trigger entity_observations_set_updated_at
before update on public.entity_observations
for each row execute function private.set_entity_audit_updated_at();

create or replace function private.protect_validated_entity_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('validated', 'superseded') then
    raise exception 'Las versiones de identidad validadas son inmutables.';
  end if;

  if tg_op = 'UPDATE' and old.status in ('validated', 'superseded') then
    if current_setting('nexaro.entity_validation', true) = 'on'
      and old.status = 'validated'
      and new.status = 'superseded'
      and new.id = old.id
      and new.case_id = old.case_id
      and new.version_number = old.version_number
      and new.commercial_name is not distinct from old.commercial_name
      and new.legal_name is not distinct from old.legal_name
      and new.name_variants is not distinct from old.name_variants
      and new.website_url is not distinct from old.website_url
      and new.domain is not distinct from old.domain
      and new.address_line_1 is not distinct from old.address_line_1
      and new.address_line_2 is not distinct from old.address_line_2
      and new.postal_code is not distinct from old.postal_code
      and new.city is not distinct from old.city
      and new.region is not distinct from old.region
      and new.country_code is not distinct from old.country_code
      and new.latitude is not distinct from old.latitude
      and new.longitude is not distinct from old.longitude
      and new.phone is not distinct from old.phone
      and new.opening_hours is not distinct from old.opening_hours
      and new.categories is not distinct from old.categories
      and new.specialties is not distinct from old.specialties
      and new.services is not distinct from old.services
      and new.menu_url is not distinct from old.menu_url
      and new.reservation_url is not distinct from old.reservation_url
      and new.contact_url is not distinct from old.contact_url
      and new.official_profiles is not distinct from old.official_profiles
      and new.external_identifiers is not distinct from old.external_identifiers
      and new.validation_note is not distinct from old.validation_note
      and new.validated_by is not distinct from old.validated_by
      and new.validated_at is not distinct from old.validated_at
      and new.created_by is not distinct from old.created_by
      and new.created_at is not distinct from old.created_at then
      return new;
    end if;
    raise exception 'Las versiones de identidad validadas son inmutables.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger entity_identity_versions_protect_validated
before update or delete on public.entity_identity_versions
for each row execute function private.protect_validated_entity_identity();

create or replace function private.enforce_current_entity_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.current_identity_version_id is not null and not exists (
    select 1
    from public.entity_identity_versions as version
    where version.id = new.current_identity_version_id
      and version.case_id = new.id
      and version.status = 'validated'
  ) then
    raise exception 'La identidad vigente debe ser una versión validada del mismo expediente.';
  end if;
  if new.status = 'ready' and new.current_identity_version_id is null then
    raise exception 'Un expediente listo necesita una identidad validada vigente.';
  end if;
  return new;
end;
$$;

create trigger entity_audit_cases_enforce_current_identity
before insert or update of status, current_identity_version_id on public.entity_audit_cases
for each row execute function private.enforce_current_entity_identity();

create or replace function public.validate_entity_identity_version(
  p_version_id uuid,
  p_validation_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case_id uuid;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede validar la identidad comercial.';
  end if;

  select version.case_id
    into v_case_id
  from public.entity_identity_versions as version
  where version.id = p_version_id and version.status = 'draft'
  for update;

  if v_case_id is null then
    raise exception 'No existe un borrador de identidad válido.';
  end if;

  perform 1 from public.entity_audit_cases where id = v_case_id for update;
  perform set_config('nexaro.entity_validation', 'on', true);

  update public.entity_identity_versions
  set status = 'superseded'
  where case_id = v_case_id and status = 'validated';

  update public.entity_identity_versions
  set status = 'validated',
      validation_note = nullif(trim(p_validation_note), ''),
      validated_by = v_user_id,
      validated_at = now()
  where id = p_version_id;

  update public.entity_audit_cases
  set status = 'ready', current_identity_version_id = p_version_id
  where id = v_case_id;

  return p_version_id;
end;
$$;

revoke execute on function public.validate_entity_identity_version(uuid, text) from public, anon;
grant execute on function public.validate_entity_identity_version(uuid, text) to authenticated;

alter table public.entity_audit_cases enable row level security;
alter table public.entity_identity_versions enable row level security;
alter table public.entity_sources enable row level security;
alter table public.entity_observations enable row level security;

revoke all on table public.entity_audit_cases from anon, authenticated;
revoke all on table public.entity_identity_versions from anon, authenticated;
revoke all on table public.entity_sources from anon, authenticated;
revoke all on table public.entity_observations from anon, authenticated;

grant select, insert, update on table public.entity_audit_cases to authenticated;
grant select, insert, update on table public.entity_identity_versions to authenticated;
grant select, insert, update on table public.entity_sources to authenticated;
grant select, insert, update on table public.entity_observations to authenticated;

create policy "Members read their Entity Audit case"
on public.entity_audit_cases for select to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()));

create policy "Admins create Entity Audit cases"
on public.entity_audit_cases for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Admins update Entity Audit cases"
on public.entity_audit_cases for update to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Members read only validated identity versions"
on public.entity_identity_versions for select to authenticated
using (
  (select private.is_platform_admin())
  or (
    status = 'validated'
    and exists (
      select 1 from public.entity_audit_cases as audit_case
      where audit_case.id = case_id
        and private.is_organization_member(audit_case.organization_id)
    )
  )
);
create policy "Admins create identity versions"
on public.entity_identity_versions for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Admins update identity drafts"
on public.entity_identity_versions for update to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Admins read entity sources"
on public.entity_sources for select to authenticated
using ((select private.is_platform_admin()));
create policy "Admins create entity sources"
on public.entity_sources for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Admins update entity sources"
on public.entity_sources for update to authenticated
using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy "Admins read entity observations"
on public.entity_observations for select to authenticated
using ((select private.is_platform_admin()));
create policy "Admins create entity observations"
on public.entity_observations for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Admins update entity observations"
on public.entity_observations for update to authenticated
using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
comment on table public.entity_audit_cases is
  'Expediente Entity Audit creado cuando Nexaro activa el acompañamiento, no al registrar la organización.';
comment on column public.entity_audit_cases.current_identity_version_id is
  'Versión exacta de identidad oficial vigente. Las futuras campañas deberán referenciar una versión concreta.';
comment on table public.entity_observations is
  'Datos declarados u observados de uso interno; no se exponen a miembros del restaurante.';
