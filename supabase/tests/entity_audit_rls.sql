begin;

select plan(21);

select has_table('public', 'entity_audit_cases', 'Existe el expediente Entity Audit');
select has_table('public', 'entity_identity_versions', 'Existe el historial de identidad');
select has_table('public', 'entity_sources', 'Existen las fuentes internas');
select has_table('public', 'entity_observations', 'Existen las observaciones internas');

select results_eq('SELECT relrowsecurity FROM pg_class WHERE oid = ''public.entity_audit_cases''::regclass', ARRAY[true], 'RLS activa en expedientes');
select results_eq('SELECT relrowsecurity FROM pg_class WHERE oid = ''public.entity_identity_versions''::regclass', ARRAY[true], 'RLS activa en identidades');
select results_eq('SELECT relrowsecurity FROM pg_class WHERE oid = ''public.entity_sources''::regclass', ARRAY[true], 'RLS activa en fuentes');
select results_eq('SELECT relrowsecurity FROM pg_class WHERE oid = ''public.entity_observations''::regclass', ARRAY[true], 'RLS activa en observaciones');

select policies_are('public', 'entity_audit_cases', array[
  'Admins create Entity Audit cases', 'Admins update Entity Audit cases',
  'Members read their Entity Audit case'
], 'El expediente permite lectura del miembro y escritura administrativa');

select policies_are('public', 'entity_identity_versions', array[
  'Admins create identity versions', 'Admins update identity drafts',
  'Members read only validated identity versions'
], 'El restaurante sÃ³lo puede leer versiones validadas');

select policies_are('public', 'entity_sources', array[
  'Admins create entity sources', 'Admins read entity sources',
  'Admins update entity sources'
], 'Las fuentes son exclusivamente administrativas');

select policies_are('public', 'entity_observations', array[
  'Admins create entity observations', 'Admins read entity observations',
  'Admins update entity observations'
], 'Las observaciones internas son exclusivamente administrativas');

select has_function('public', 'validate_entity_identity_version', array['uuid', 'text'], 'Existe validaciÃ³n atÃ³mica de identidad');
select has_function(
  'public',
  'ensure_entity_audit_case',
  array['uuid', 'uuid', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text[]'],
  'Existe creaciÃ³n atÃ³mica e idempotente del expediente'
);
select has_trigger('public', 'entity_identity_versions', 'entity_identity_versions_protect_validated', 'Las versiones validadas estÃ¡n protegidas');
select has_trigger('public', 'entity_audit_cases', 'entity_audit_cases_enforce_current_identity', 'El expediente sÃ³lo referencia su identidad validada');

select ok(
  has_column_privilege('authenticated', 'public.entity_identity_versions', 'commercial_name', 'SELECT'),
  'El restaurante puede leer campos autorizados de su identidad'
);
select ok(
  not has_column_privilege('authenticated', 'public.entity_identity_versions', 'validation_note', 'SELECT'),
  'La nota de validaciÃ³n no estÃ¡ expuesta'
);
select ok(
  not has_column_privilege('authenticated', 'public.entity_audit_cases', 'activated_by', 'SELECT'),
  'Los metadatos administrativos del expediente no estÃ¡n expuestos'
);
select ok(
  not has_table_privilege('authenticated', 'public.entity_sources', 'SELECT'),
  'Las fuentes internas no pueden consultarse directamente'
);
select ok(
  not has_table_privilege('authenticated', 'public.entity_observations', 'SELECT'),
  'Las observaciones internas no pueden consultarse directamente'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'entity-a@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'entity-b@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'entity-admin@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.platform_admins (user_id)
values ('10000000-0000-4000-8000-000000000003');

insert into public.organizations (id, name, created_by) values
  ('20000000-0000-4000-8000-000000000001', 'Entity Audit A', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Entity Audit B', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000003', 'Entity Audit idempotente', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000004', 'Entity Audit rollback', '10000000-0000-4000-8000-000000000001');

insert into public.entity_audit_cases (id, organization_id, activation_source, activated_by) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'admin', '10000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'admin', '10000000-0000-4000-8000-000000000003');

insert into public.entity_identity_versions (
  id, case_id, version_number, status, commercial_name, validation_note,
  validated_by, validated_at, created_by
) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, 'validated', 'Restaurante A', 'nota interna A', '10000000-0000-4000-8000-000000000003', now(), '10000000-0000-4000-8000-000000000003'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 2, 'draft', 'Borrador A', null, null, null, '10000000-0000-4000-8000-000000000003'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 1, 'validated', 'Restaurante B', 'nota interna B', '10000000-0000-4000-8000-000000000003', now(), '10000000-0000-4000-8000-000000000003');

update public.entity_audit_cases set
  status = 'ready',
  current_identity_version_id = case organization_id
    when '20000000-0000-4000-8000-000000000001' then '40000000-0000-4000-8000-000000000001'::uuid
    else '40000000-0000-4000-8000-000000000003'::uuid
  end
where id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002'
);

insert into public.entity_sources (id, case_id, source_type, name, created_by)
values ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'website', 'Fuente interna', '10000000-0000-4000-8000-000000000003');
insert into public.entity_observations (case_id, source_id, field_key, observation_kind, value, internal_note, created_by)
values ('30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'phone', 'observed', '"960000000"'::jsonb, 'no exponer', '10000000-0000-4000-8000-000000000003');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;

do $$
begin
  if (select count(*) from public.entity_audit_cases) <> 1 then
    raise exception 'RLS no aislÃ³ los expedientes de otras organizaciones';
  end if;
  if (select count(*) from public.entity_identity_versions) <> 1 then
    raise exception 'El restaurante pudo ver un borrador o una identidad ajena';
  end if;
  if not exists (
    select 1 from public.entity_identity_versions
    where commercial_name = 'Restaurante A' and status = 'validated'
  ) then
    raise exception 'El restaurante no pudo leer su identidad validada';
  end if;
end;
$$;

do $$
begin
  perform validation_note from public.entity_identity_versions limit 1;
  raise exception 'La nota de validaciÃ³n fue accesible directamente';
exception
  when insufficient_privilege then null;
end;
$$;

do $$
begin
  perform 1 from public.entity_observations limit 1;
  raise exception 'Las observaciones internas fueron accesibles directamente';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
set local role authenticated;

select public.ensure_entity_audit_case(
  '20000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000003',
  'admin', 'Restaurante idempotente'
);
select public.ensure_entity_audit_case(
  '20000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000003',
  'admin', 'Restaurante idempotente'
);

do $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.entity_audit_cases
  where organization_id = '20000000-0000-4000-8000-000000000003';
  if v_case_id is null
    or (select count(*) from public.entity_audit_cases where organization_id = '20000000-0000-4000-8000-000000000003') <> 1
    or (select count(*) from public.entity_identity_versions where case_id = v_case_id) <> 1 then
    raise exception 'La activaciÃ³n repetida no fue idempotente';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.ensure_entity_audit_case(
      '20000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000003',
      'admin', null
    );
    raise exception 'La creaciÃ³n invÃ¡lida no fallÃ³';
  exception
    when not_null_violation then null;
  end;
  if exists (
    select 1 from public.entity_audit_cases
    where organization_id = '20000000-0000-4000-8000-000000000004'
  ) then
    raise exception 'La funciÃ³n dejÃ³ un expediente parcial tras fallar el borrador';
  end if;
end;
$$;

reset role;

do $$
begin
  update public.entity_identity_versions
  set commercial_name = 'MutaciÃ³n prohibida'
  where id = '40000000-0000-4000-8000-000000000001';
  raise exception 'Una identidad validada pudo modificarse';
exception
  when others then
    if sqlerrm = 'Una identidad validada pudo modificarse' then raise; end if;
end;
$$;

select * from finish();
rollback;

