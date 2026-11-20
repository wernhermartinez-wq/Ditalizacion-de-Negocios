begin;

select plan(28);

select has_table('public', 'entity_audit_intervention_proposals', 'Existen propuestas de intervención');
select has_table('public', 'entity_audit_proposal_findings', 'Existe la relación con hallazgos de origen');
select has_function('public', 'create_entity_audit_intervention_proposal', array['uuid','uuid','uuid[]','integer','text','text','text','text','text'], 'La creación es transaccional');
select has_function('public', 'link_entity_audit_proposal_to_task', array['uuid','uuid'], 'La vinculación explícita reutiliza actuaciones');
select has_trigger('public', 'entity_audit_intervention_proposals', 'entity_audit_intervention_proposals_enforce_integrity', 'La propuesta valida su actuación vinculada');
select has_trigger('public', 'entity_audit_proposal_findings', 'entity_audit_proposal_findings_immutable', 'La evidencia de origen es inmutable');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_intervention_proposals''::regclass', array[true], 'RLS activa en propuestas');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_proposal_findings''::regclass', array[true], 'RLS activa en evidencia de propuestas');
select policies_are('public', 'entity_audit_intervention_proposals', array[
  'Admins manage Entity Audit intervention proposals',
  'Members read authorized Entity Audit intervention proposals'
], 'Las propuestas separan gestión Nexaro y lectura autorizada');
select policies_are('public', 'entity_audit_proposal_findings', array[
  'Admins manage Entity Audit proposal findings'
], 'La evidencia detallada es exclusivamente administrativa');
select ok(
  not has_column_privilege('authenticated', 'public.entity_audit_intervention_proposals', 'internal_note', 'SELECT'),
  'Las notas internas no tienen privilegio de lectura para clientes'
);
select ok(
  not has_table_privilege('authenticated', 'public.entity_audit_proposal_findings', 'SELECT'),
  'Los clientes no tienen privilegio de lectura sobre evidencia interna'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'proposal-admin@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'proposal-a@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'proposal-b@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.platform_admins (user_id) values ('91000000-0000-4000-8000-000000000001');
insert into public.organizations (id, name, created_by) values
  ('92000000-0000-4000-8000-000000000001', 'Proposal A', '91000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000002', 'Proposal B', '91000000-0000-4000-8000-000000000001');
insert into public.organization_memberships (organization_id, user_id, role) values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', 'owner'),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000003', 'owner');
insert into public.entity_audit_cases (id, organization_id, status, activation_source, activated_by) values
  ('93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'identity_pending', 'admin', '91000000-0000-4000-8000-000000000001');
insert into public.entity_identity_versions (
  id, case_id, version_number, status, commercial_name, address_line_1, city, country_code,
  validated_by, validated_at, created_by
) values (
  '94000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', 1,
  'validated', 'Proposal A', 'Calle Mayor 10', 'Valencia', 'ES',
  '91000000-0000-4000-8000-000000000001', now(), '91000000-0000-4000-8000-000000000001'
);
update public.entity_audit_cases set status = 'ready', current_identity_version_id = '94000000-0000-4000-8000-000000000001'
where id = '93000000-0000-4000-8000-000000000001';
insert into public.visibility_projects (id, organization_id, brand_name, domain, country, created_by) values
  ('95000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'Proposal A', 'proposal-a.test', 'ES', '91000000-0000-4000-8000-000000000001');
insert into public.visibility_runs (id, project_id, idempotency_key, trigger_type, status, requested_providers, created_by, completed_at) values
  ('96000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'proposal-run-0001', 'manual', 'completed', array['openai'], '91000000-0000-4000-8000-000000000001', now());
insert into public.entity_audit_campaigns (
  id, case_id, organization_id, identity_version_id, standard_question_set_id,
  visibility_project_id, visibility_run_id, campaign_number, status, idempotency_key, created_by
) values (
  '97000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001',
  (select id from public.entity_audit_question_sets where set_type = 'standard' order by version_number desc limit 1),
  '95000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001',
  1, 'completed', 'proposal-campaign-0001', '91000000-0000-4000-8000-000000000001'
);
insert into public.entity_audit_evaluation_runs (
  id, campaign_id, organization_id, identity_version_id, status, model, idempotency_key,
  estimated_cost_usd, actual_cost_usd, cost_basis, input_tokens, output_tokens, created_by, completed_at
) values (
  '98000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001',
  'completed', 'simulated', 'proposal-evaluation-0001', 0.01, 0.01, 'actual', 100, 50,
  '91000000-0000-4000-8000-000000000001', now()
);
insert into public.entity_audit_findings (
  id, evaluation_run_id, campaign_id, organization_id, finding_key, field_key,
  classification, summary, evidence_summary, provider_count, response_count,
  review_status, reviewed_by, reviewed_at
) values
  ('99000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'direccion-confirmada', 'address', 'incorrect', 'La respuesta muestra Calle Falsa 5.', 'La identidad validada indica Calle Mayor 10.', 1, 1, 'confirmed', '91000000-0000-4000-8000-000000000001', now()),
  ('99000000-0000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'telefono-pendiente', 'phone', 'unverifiable', 'La respuesta menciona otro teléfono.', 'Requiere revisión.', 1, 1, 'pending', null, null);
insert into public.nexaro_tasks (
  id, organization_id, source, source_reference, title, description, priority, status, created_by
) values
  ('9a000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'manual', 'restaurant:local_search', 'Mejorar la presencia en búsquedas locales', null, 'high', 'pending', '91000000-0000-4000-8000-000000000001'),
  ('9a000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', 'manual', 'restaurant:business_data', 'Corregir información de B', null, 'high', 'pending', '91000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$select public.create_entity_audit_intervention_proposal(
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    array['99000000-0000-4000-8000-000000000001'::uuid],
    3, 'La dirección publicada no coincide con la identidad validada.',
    'Un directorio antiguo podría propagarla.',
    'Revisar y corregir las fuentes propias y directorios identificados.',
    'Las fuentes controladas muestran Calle Mayor 10.',
    'Nota Nexaro'
  )$$,
  'Nexaro crea una propuesta sólo desde hallazgos confirmados'
);
select results_eq(
  $$select count(*)::bigint from public.entity_audit_intervention_proposals where organization_id = '92000000-0000-4000-8000-000000000001'$$,
  array[1::bigint], 'La propuesta se crea una sola vez'
);
select results_eq(
  $$select count(*)::bigint from public.nexaro_tasks where organization_id = '92000000-0000-4000-8000-000000000001'$$,
  array[1::bigint], 'Crear una propuesta no crea tareas ni actuaciones'
);
select throws_ok(
  $$select public.create_entity_audit_intervention_proposal(
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    array['99000000-0000-4000-8000-000000000002'::uuid],
    3, 'Problema pendiente', null, 'Acción sugerida', 'Resultado esperado', null
  )$$,
  'P0001', 'Todos los hallazgos deben estar confirmados y pertenecer al restaurante.',
  'No se admiten hallazgos pendientes'
);
select throws_ok(
  $$select public.link_entity_audit_proposal_to_task(
    (select id from public.entity_audit_intervention_proposals limit 1),
    '9a000000-0000-4000-8000-000000000002'
  )$$,
  'P0001', 'La propuesta debe estar aprobada antes de vincularla.',
  'Una propuesta sin aprobar no se vincula, incluso a otra organización'
);

reset role;
select results_eq(
  $$select campaign_id = '97000000-0000-4000-8000-000000000001'::uuid
      and identity_version_id = '94000000-0000-4000-8000-000000000001'::uuid
      and evidence_snapshot = 'La identidad validada indica Calle Mayor 10.'
    from public.entity_audit_proposal_findings$$,
  array[true], 'La evidencia conserva campaña e identidad de origen'
);
select throws_ok(
  $$update public.entity_audit_proposal_findings set evidence_snapshot = 'Mutación'$$,
  'P0001', 'La evidencia de origen de una propuesta es inmutable.',
  'La evidencia enlazada no puede reinterpretarse'
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok(
  $$update public.entity_audit_intervention_proposals
    set review_status = 'approved', reviewed_by = '91000000-0000-4000-8000-000000000001',
        reviewed_at = now(), client_visible = true,
        client_summary = 'Nexaro corregirá la coherencia de la dirección publicada.'
    where organization_id = '92000000-0000-4000-8000-000000000001'$$,
  'Nexaro aprueba y autoriza explícitamente la información del cliente'
);
select throws_ok(
  $$select public.link_entity_audit_proposal_to_task(
    (select id from public.entity_audit_intervention_proposals where organization_id = '92000000-0000-4000-8000-000000000001'),
    '9a000000-0000-4000-8000-000000000002'
  )$$,
  'P0001', 'La actuación no pertenece al restaurante.',
  'Una propuesta aprobada no puede vincularse a la actuación de otro restaurante'
);
select lives_ok(
  $$select public.link_entity_audit_proposal_to_task(
    (select id from public.entity_audit_intervention_proposals where organization_id = '92000000-0000-4000-8000-000000000001'),
    '9a000000-0000-4000-8000-000000000001'
  )$$,
  'Nexaro vincula explícitamente una propuesta aprobada a una actuación existente'
);
select results_eq(
  $$select status from public.nexaro_tasks where id = '9a000000-0000-4000-8000-000000000001'$$,
  array['pending'::text], 'La vinculación no modifica el progreso ni el estado de la actuación'
);

reset role;
select results_eq(
  $$select linked_task_id = '9a000000-0000-4000-8000-000000000001'::uuid
    from public.entity_audit_intervention_proposals
    where organization_id = '92000000-0000-4000-8000-000000000001'$$,
  array[true], 'La propuesta conserva la actuación vinculada'
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select public.create_entity_audit_intervention_proposal(
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  array['99000000-0000-4000-8000-000000000001'::uuid],
  2, 'Segundo problema interno', null, 'Segunda acción', 'Segundo resultado', null
);

reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select results_eq(
  'select count(*)::bigint from public.entity_audit_intervention_proposals',
  array[1::bigint], 'El restaurante ve sólo la propuesta aprobada y autorizada, no el borrador'
);
select throws_ok(
  $$select internal_note from public.entity_audit_intervention_proposals limit 1$$,
  '42501', null, 'El restaurante no puede consultar notas internas'
);
select throws_ok(
  $$select * from public.entity_audit_proposal_findings limit 1$$,
  '42501', null, 'El restaurante no puede consultar evidencia interna directa'
);

reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select results_eq(
  'select count(*)::bigint from public.entity_audit_intervention_proposals',
  array[0::bigint], 'Otro restaurante no puede consultar propuestas ajenas'
);

reset role;
select * from finish();
rollback;

