begin;

select plan(28);

select has_table('public', 'entity_audit_question_sets', 'Existen conjuntos versionados de preguntas');
select has_table('public', 'entity_audit_questions', 'Existe el catálogo inmutable de preguntas');
select has_table('public', 'entity_audit_campaigns', 'Existen campañas Entity Audit');
select has_table('public', 'entity_audit_campaign_questions', 'Existe la composición ordenada de campañas');
select has_function('public', 'create_entity_audit_custom_question_set', array['uuid', 'jsonb'], 'Existe versionado transaccional de preguntas personalizadas');
select has_function('public', 'prepare_entity_audit_campaign', array['uuid', 'text'], 'Existe preparación transaccional de campañas');
select has_trigger('public', 'entity_audit_questions', 'entity_audit_questions_immutable', 'Las preguntas versionadas son inmutables');
select has_trigger('public', 'entity_audit_campaigns', 'entity_audit_campaigns_enforce_references', 'La campaña valida expediente, identidad y organización');
select has_trigger('public', 'entity_audit_campaign_questions', 'entity_audit_campaign_questions_enforce_references', 'La composición rechaza preguntas cruzadas');
select results_eq(
  $$select count(*)::bigint from public.entity_audit_questions q join public.entity_audit_question_sets s on s.id = q.question_set_id where s.set_type = 'standard' and s.version_number = 1$$,
  array[10::bigint],
  'La versión estándar inicial contiene 10 preguntas'
);
select results_eq(
  $$select count(distinct q.category)::bigint from public.entity_audit_questions q join public.entity_audit_question_sets s on s.id = q.question_set_id where s.set_type = 'standard' and s.version_number = 1$$,
  array[5::bigint],
  'Las preguntas estándar cubren cinco categorías'
);
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_campaigns''::regclass', array[true], 'RLS activa en campañas');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_campaign_questions''::regclass', array[true], 'RLS activa en composición');
select policies_are('public', 'entity_audit_campaigns', array[
  'Admins create Entity Audit campaigns', 'Members read their Entity Audit campaigns'
], 'Las campañas aíslan lectura por restaurante y escritura administrativa');
select policies_are('public', 'entity_audit_campaign_questions', array[
  'Admins create Entity Audit campaign questions', 'Members read their Entity Audit campaign questions'
], 'La composición mantiene el aislamiento de su campaña');
select col_is_fk('public', 'visibility_runs', 'entity_identity_version_id', 'La ejecución referencia la identidad exacta');
select col_is_fk('public', 'visibility_runs', 'entity_audit_campaign_id', 'La ejecución referencia la campaña exacta');
select results_eq(
  $$select count(*)::bigint
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = 'public.visibility_runs'::regclass
      and i.indisunique and a.attname = 'entity_audit_campaign_id'$$,
  array[1::bigint],
  'Una campaña sólo puede tener una ejecución aunque cambie la clave de idempotencia'
);
select has_column('public', 'visibility_responses', 'ordered_position', 'Se conserva la posición en listas ordenadas');
select has_column('public', 'visibility_responses', 'first_mention', 'Se conserva la primera mención no ordenada');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'campaign-admin@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'campaign-member@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.platform_admins (user_id) values ('61000000-0000-4000-8000-000000000001');
insert into public.organizations (id, name, website, city, created_by)
values ('62000000-0000-4000-8000-000000000001', 'Basilico Test', 'https://basilico.test', 'Valencia', '61000000-0000-4000-8000-000000000001');
insert into public.organization_memberships (organization_id, user_id, role)
values ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', 'owner')
on conflict do nothing;
insert into public.entity_audit_cases (id, organization_id, activation_source, activated_by)
values ('63000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', 'admin', '61000000-0000-4000-8000-000000000001');
insert into public.entity_identity_versions (
  id, case_id, version_number, status, commercial_name, domain, city, categories, specialties,
  validated_by, validated_at, created_by
) values (
  '64000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', 1,
  'validated', 'Pizzería Basilico', 'basilico.test', 'Valencia', array['Pizzería'], array['pizza italiana'],
  '61000000-0000-4000-8000-000000000001', now(), '61000000-0000-4000-8000-000000000001'
);
update public.entity_audit_cases set status = 'ready', current_identity_version_id = '64000000-0000-4000-8000-000000000001'
where id = '63000000-0000-4000-8000-000000000001';
insert into public.visibility_projects (
  organization_id, brand_name, domain, country, status, schedule_frequency,
  next_run_at, settings, created_by
) values (
  '62000000-0000-4000-8000-000000000001', 'Configuración existente', 'config-existente.test',
  'ES', 'paused', 'weekly', '2026-11-01 09:00:00+00',
  '{"max_competitors":4,"max_active_prompts":20,"sentinel":"preserve"}'::jsonb,
  '61000000-0000-4000-8000-000000000001'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$select public.create_entity_audit_custom_question_set('62000000-0000-4000-8000-000000000001', '["¿Dónde comer pizza familiar en Valencia?", "¿Qué pizzería tiene opciones vegetarianas?"]'::jsonb)$$,
  'Nexaro puede crear una versión personalizada válida'
);
select throws_ok(
  $$select public.create_entity_audit_custom_question_set('62000000-0000-4000-8000-000000000001', '["Pregunta personalizada número uno", "Pregunta personalizada número dos", "Pregunta personalizada número tres", "Pregunta personalizada número cuatro", "Pregunta personalizada número cinco", "Pregunta personalizada número seis"]'::jsonb)$$,
  'P0001', 'El piloto permite un máximo de 5 preguntas personalizadas.',
  'Se rechazan más de cinco preguntas personalizadas'
);
select lives_ok(
  $$select public.prepare_entity_audit_campaign('62000000-0000-4000-8000-000000000001', 'campaign-test-key-0001')$$,
  'Se prepara la primera campaña con identidad validada'
);
select results_eq(
  $$select status = 'paused'
      and schedule_frequency = 'weekly'
      and next_run_at = '2026-11-01 09:00:00+00'::timestamptz
      and settings = '{"max_competitors":4,"max_active_prompts":20,"sentinel":"preserve"}'::jsonb
    from public.visibility_projects
    where organization_id = '62000000-0000-4000-8000-000000000001'$$,
  array[true],
  'Preparar Entity Audit no modifica estado, programación ni configuración del proyecto existente'
);
select lives_ok(
  $$select public.prepare_entity_audit_campaign('62000000-0000-4000-8000-000000000001', 'campaign-test-key-0001')$$,
  'Repetir la misma clave es idempotente'
);
select results_eq(
  $$select count(*)::bigint from public.entity_audit_campaigns where organization_id = '62000000-0000-4000-8000-000000000001'$$,
  array[1::bigint], 'La idempotencia no duplica campañas'
);
select results_eq(
  $$select count(*)::bigint from public.entity_audit_campaign_questions where campaign_id = (select id from public.entity_audit_campaigns where idempotency_key = 'campaign-test-key-0001')$$,
  array[12::bigint], 'La campaña combina diez preguntas estándar y dos personalizadas sin duplicarlas'
);
select results_eq(
  $$select count(*)::bigint from public.visibility_prompts where project_id = (select visibility_project_id from public.entity_audit_campaigns where idempotency_key = 'campaign-test-key-0001')$$,
  array[12::bigint], 'El motor reutilizado materializa una sola pregunta por versión de identidad'
);

reset role;

select * from finish();
rollback;
