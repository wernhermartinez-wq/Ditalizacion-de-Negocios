create or replace function public.ensure_entity_audit_case(
  p_organization_id uuid,
  p_activated_by uuid,
  p_activation_source text,
  p_commercial_name text,
  p_legal_name text default null,
  p_website_url text default null,
  p_domain text default null,
  p_city text default null,
  p_country_code text default 'ES',
  p_categories text[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case_id uuid;
begin
  if current_user <> 'service_role'
    and not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede activar un expediente Entity Audit.';
  end if;

  if p_activation_source not in ('subscription', 'admin') then
    raise exception 'Origen de activación no válido.';
  end if;

  if not exists (
    select 1 from public.organizations where id = p_organization_id
  ) then
    raise exception 'La organización indicada no existe.';
  end if;

  -- Serializa las activaciones de una misma organización. La función completa
  -- se ejecuta dentro de la transacción de la llamada RPC.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));

  insert into public.entity_audit_cases (
    organization_id,
    activation_source,
    activated_by
  )
  values (
    p_organization_id,
    p_activation_source,
    p_activated_by
  )
  on conflict (organization_id) do nothing;

  select audit_case.id
    into v_case_id
  from public.entity_audit_cases as audit_case
  where audit_case.organization_id = p_organization_id
  for update;

  if v_case_id is null then
    raise exception 'No se pudo crear o recuperar el expediente Entity Audit.';
  end if;

  -- Sólo repara el estado inicial incompleto. Nunca crea una nueva versión si
  -- el expediente ya tiene historial.
  if not exists (
    select 1
    from public.entity_identity_versions
    where case_id = v_case_id
  ) then
    insert into public.entity_identity_versions (
      case_id,
      version_number,
      commercial_name,
      legal_name,
      website_url,
      domain,
      city,
      country_code,
      categories,
      created_by
    )
    values (
      v_case_id,
      1,
      p_commercial_name,
      p_legal_name,
      p_website_url,
      p_domain,
      p_city,
      upper(coalesce(nullif(trim(p_country_code), ''), 'ES')),
      coalesce(p_categories, '{}'),
      p_activated_by
    );
  end if;

  return v_case_id;
end;
$$;

revoke execute on function public.ensure_entity_audit_case(
  uuid, uuid, text, text, text, text, text, text, text, text[]
) from public, anon;
grant execute on function public.ensure_entity_audit_case(
  uuid, uuid, text, text, text, text, text, text, text, text[]
) to authenticated, service_role;

grant select, insert, update on table
  public.entity_audit_cases,
  public.entity_identity_versions,
  public.entity_sources,
  public.entity_observations
to service_role;

-- RLS decide qué filas puede ver cada usuario. Los privilegios de columna
-- impiden además que un miembro consulte notas o metadatos internos aunque
-- construya una petición directa contra la Data API.
revoke select on table public.entity_audit_cases from authenticated;
grant select (
  id,
  organization_id,
  status,
  current_identity_version_id
) on table public.entity_audit_cases to authenticated;

revoke select on table public.entity_identity_versions from authenticated;
grant select (
  id,
  case_id,
  version_number,
  status,
  commercial_name,
  legal_name,
  name_variants,
  website_url,
  domain,
  address_line_1,
  address_line_2,
  postal_code,
  city,
  region,
  country_code,
  latitude,
  longitude,
  phone,
  opening_hours,
  categories,
  specialties,
  services,
  menu_url,
  reservation_url,
  contact_url,
  official_profiles,
  validated_at
) on table public.entity_identity_versions to authenticated;

revoke select on table public.entity_sources from authenticated;
revoke select on table public.entity_observations from authenticated;

comment on function public.ensure_entity_audit_case(
  uuid, uuid, text, text, text, text, text, text, text, text[]
) is 'Creación transaccional e idempotente del expediente y su primer borrador.';
