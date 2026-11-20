begin;

select plan(28);

select has_table('public', 'entity_audit_evaluation_budgets', 'Existe el presupuesto factual por campaña');
select has_table('public', 'entity_audit_evaluation_runs', 'Existe el registro de evaluaciones factuales');
select has_table('public', 'entity_audit_factual_claims', 'Existen afirmaciones factuales trazables');
select has_table('public', 'entity_audit_findings', 'Existen hallazgos agrupados');
select has_table('public', 'entity_audit_finding_reviews', 'Las notas internas están separadas');
select has_function('public', 'reserve_entity_audit_factual_evaluation', array['uuid','text','numeric','text','uuid'], 'La reserva de presupuesto es transaccional');
select has_function('public', 'complete_entity_audit_factual_evaluation', array['uuid','numeric','integer','integer','jsonb','jsonb'], 'La finalización factual es transaccional');
select has_function('public', 'fail_entity_audit_factual_evaluation', array['uuid','text'], 'Los fallos liberan la reserva');
select has_trigger('public', 'entity_audit_evaluation_budgets', 'entity_audit_evaluation_budgets_protect_limit', 'El límite no puede bajar del consumo reservado');
select has_trigger('public', 'entity_audit_factual_claims', 'entity_audit_factual_claims_enforce_response', 'Cada afirmación conserva la respuesta original');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_evaluation_budgets''::regclass', array[true], 'RLS activa en presupuestos');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_evaluation_runs''::regclass', array[true], 'RLS activa en evaluaciones');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_factual_claims''::regclass', array[true], 'RLS activa en afirmaciones');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_findings''::regclass', array[true], 'RLS activa en hallazgos');
select results_eq('select relrowsecurity from pg_class where oid = ''public.entity_audit_finding_reviews''::regclass', array[true], 'RLS activa en notas internas');
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname = 'public' and indexname = 'entity_audit_evaluation_one_running_idx'$$,
  array[1::bigint], 'Existe una única evaluación en ejecución por campaña'
);
select ok(
  not has_column_privilege('authenticated', 'public.entity_audit_findings', 'reviewed_by', 'SELECT'),
  'El restaurante no tiene privilegio sobre metadatos administrativos de revisión'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'factual-admin@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'factual-a@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'factual-b@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.platform_admins (user_id) values ('81000000-0000-4000-8000-000000000001');
insert into public.organizations (id, name, created_by) values
  ('82000000-0000-4000-8000-000000000001', 'Factual A', '81000000-0000-4000-8000-000000000001'),
  ('82000000-0000-4000-8000-000000000002', 'Factual B', '81000000-0000-4000-8000-000000000001');
insert into public.organization_memberships (organization_id, user_id, role) values
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'owner'),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000003', 'owner');
insert into public.entity_audit_cases (id, organization_id, status, activation_source, activated_by) values
  ('83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'identity_pending', 'admin', '81000000-0000-4000-8000-000000000001'),
  ('83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002', 'identity_pending', 'admin', '81000000-0000-4000-8000-000000000001');
insert into public.entity_identity_versions (
  id, case_id, version_number, status, commercial_name, address_line_1, city, country_code,
  phone, validated_by, validated_at, created_by
) values
  ('84000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 1, 'validated', 'Factual A', 'Calle Mayor 10', 'Valencia', 'ES', '+34960000000', '81000000-0000-4000-8000-000000000001', now(), '81000000-0000-4000-8000-000000000001'),
  ('84000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000002', 1, 'validated', 'Factual B', 'Calle B 2', 'Valencia', 'ES', '+34960000002', '81000000-0000-4000-8000-000000000001', now(), '81000000-0000-4000-8000-000000000001');
update public.entity_audit_cases set status = 'ready', current_identity_version_id = case organization_id
  when '82000000-0000-4000-8000-000000000001' then '84000000-0000-4000-8000-000000000001'::uuid
  else '84000000-0000-4000-8000-000000000002'::uuid end;
insert into public.visibility_projects (id, organization_id, brand_name, domain, country, created_by) values
  ('85000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'Factual A', 'factual-a.test', 'ES', '81000000-0000-4000-8000-000000000001');
insert into public.visibility_prompts (id, project_id, question, country, language, status, active, created_by, approved_by, approved_at) values
  ('86000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '¿Dónde está el restaurante Factual A?', 'ES', 'es', 'approved', true, '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', now());
insert into public.visibility_runs (id, project_id, idempotency_key, trigger_type, status, requested_providers, created_by, completed_at) values
  ('87000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', 'factual-run-0001', 'manual', 'completed', array['openai'], '81000000-0000-4000-8000-000000000001', now());
insert into public.entity_audit_campaigns (
  id, case_id, organization_id, identity_version_id, standard_question_set_id,
  visibility_project_id, visibility_run_id, campaign_number, status, idempotency_key, created_by
) values (
  '88000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001',
  (select id from public.entity_audit_question_sets where set_type = 'standard' order by version_number desc limit 1),
  '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', 1,
  'completed', 'factual-campaign-0001', '81000000-0000-4000-8000-000000000001'
);
insert into public.visibility_responses (
  id, run_id, prompt_id, provider, model, country, language, original_response, status
) values (
  '89000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001',
  '86000000-0000-4000-8000-000000000001', 'openai', 'simulated', 'ES', 'es',
  'Factual A está en Calle Falsa 5.', 'completed'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$select public.reserve_entity_audit_factual_evaluation('88000000-0000-4000-8000-000000000001', 'factual-evaluation-0001', 0.020000, 'simulated', '81000000-0000-4000-8000-000000000001')$$,
  'Nexaro reserva presupuesto antes de evaluar'
);
select throws_ok(
  $$select public.reserve_entity_audit_factual_evaluation('88000000-0000-4000-8000-000000000001', 'factual-evaluation-0002', 0.020000, 'simulated', '81000000-0000-4000-8000-000000000001')$$,
  'P0001', 'Ya existe una evaluación factual en ejecución para esta campaña.',
  'Otra clave no permite una evaluación simultánea de la misma campaña'
);

do $$
declare v_run_id uuid;
begin
  select id into v_run_id from public.entity_audit_evaluation_runs where idempotency_key = 'factual-evaluation-0001';
  begin
    perform public.complete_entity_audit_factual_evaluation(
      v_run_id, 0.010000, 100, 50,
      '[{"response_id":"89000000-0000-4000-8000-000000000099","provider":"openai","assertion_text":"Dirección falsa","field_key":"address","classification":"incorrect","evidence_text":"No coincide","identity_evidence":{},"finding_key":"direccion","claim_fingerprint":"bad-response"}]'::jsonb,
      '[]'::jsonb
    );
    raise exception 'La finalización inconsistente no falló';
  exception when others then
    if sqlerrm = 'La finalización inconsistente no falló' then raise; end if;
  end;
end;
$$;
select results_eq(
  $$select (select count(*) from public.entity_audit_factual_claims) = 0
      and (select status from public.entity_audit_evaluation_runs where idempotency_key = 'factual-evaluation-0001') = 'running'
      and (select reserved_usd from public.entity_audit_evaluation_budgets where campaign_id = '88000000-0000-4000-8000-000000000001') = 0.020000$$,
  array[true], 'Un fallo durante la escritura revierte afirmaciones, estado y presupuesto'
);
select lives_ok(
  $$select public.complete_entity_audit_factual_evaluation(
    (select id from public.entity_audit_evaluation_runs where idempotency_key = 'factual-evaluation-0001'),
    0.010000, 100, 50,
    '[{"response_id":"89000000-0000-4000-8000-000000000001","provider":"openai","assertion_text":"Factual A está en Calle Falsa 5.","field_key":"address","classification":"incorrect","evidence_text":"La identidad validada indica Calle Mayor 10.","identity_evidence":{"value":"Calle Mayor 10"},"finding_key":"direccion-incorrecta","claim_fingerprint":"claim-0001"}]'::jsonb,
    '[{"finding_key":"direccion-incorrecta","field_key":"address","classification":"incorrect","summary":"Dirección incorrecta","evidence_summary":"La identidad validada indica Calle Mayor 10.","provider_count":1,"response_count":1}]'::jsonb
  )$$,
  'La finalización simulada registra consumo, afirmación y hallazgo'
);
select results_eq('select count(*)::bigint from public.entity_audit_factual_claims', array[1::bigint], 'Se registra una afirmación trazable');
select results_eq('select count(*)::bigint from public.entity_audit_findings', array[1::bigint], 'Se registra un hallazgo pendiente agrupado');
select throws_ok(
  $$select public.reserve_entity_audit_factual_evaluation('88000000-0000-4000-8000-000000000001', 'factual-evaluation-0003', 0.300000, 'simulated', '81000000-0000-4000-8000-000000000001')$$,
  'P0001', 'La estimación supera el presupuesto restante de la campaña.',
  'Una estimación superior al saldo se bloquea antes del proveedor'
);
select throws_ok(
  $$update public.entity_audit_evaluation_budgets set budget_usd = 0.005000 where campaign_id = '88000000-0000-4000-8000-000000000001'$$,
  'P0001', 'El presupuesto no puede ser inferior al consumo registrado o reservado.',
  'No puede reducirse el límite por debajo del consumo'
);

update public.entity_audit_findings set review_status = 'confirmed', reviewed_by = '81000000-0000-4000-8000-000000000001', reviewed_at = now();
insert into public.entity_audit_finding_reviews (finding_id, organization_id, internal_note, reviewed_by)
select id, organization_id, 'Nota Nexaro no visible', '81000000-0000-4000-8000-000000000001' from public.entity_audit_findings;
insert into public.entity_audit_findings (
  evaluation_run_id, campaign_id, organization_id, finding_key, field_key,
  classification, summary, evidence_summary, provider_count, response_count
) select id, campaign_id, organization_id, 'telefono-pendiente', 'phone',
  'unverifiable', 'Teléfono pendiente', 'Requiere revisión humana.', 1, 1
from public.entity_audit_evaluation_runs where idempotency_key = 'factual-evaluation-0001';

reset role;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select results_eq('select count(*)::bigint from public.entity_audit_findings', array[1::bigint], 'El restaurante ve sólo su hallazgo confirmado y no el pendiente');
select results_eq('select count(*)::bigint from public.entity_audit_finding_reviews', array[0::bigint], 'El restaurante no ve notas internas mediante consulta directa');
select results_eq(
  $$select count(*)::bigint from public.entity_audit_findings where organization_id = '82000000-0000-4000-8000-000000000002'$$,
  array[0::bigint], 'El restaurante no puede consultar hallazgos de otra organización'
);

reset role;
select * from finish();
rollback;
