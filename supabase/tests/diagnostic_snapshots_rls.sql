begin;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['assessment_scores', 'roadmaps', 'roadmap_items'] loop
    if not exists (
      select 1 from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = v_table
        and relation.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', v_table;
    end if;
  end loop;
end;
$$;

set local role anon;

do $$
begin
  perform 1 from public.assessment_scores limit 1;
  raise exception 'anon must not read assessment score snapshots';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;

do $$
begin
  if has_table_privilege('authenticated', 'public.assessment_scores', 'UPDATE')
    or has_table_privilege('authenticated', 'public.assessment_scores', 'DELETE')
    or has_table_privilege('authenticated', 'public.roadmaps', 'UPDATE')
    or has_table_privilege('authenticated', 'public.roadmaps', 'DELETE')
    or has_table_privilege('authenticated', 'public.roadmap_items', 'UPDATE')
    or has_table_privilege('authenticated', 'public.roadmap_items', 'DELETE') then
    raise exception 'authenticated must not mutate validated snapshots';
  end if;
end;
$$;

create temporary table diagnostic_snapshot_context as
select diagnostic.id as diagnostic_id, administrator.user_id as administrator_id
from public.diagnostics diagnostic
cross join lateral (select user_id from public.platform_admins limit 1) administrator
where diagnostic.status = 'completed'
limit 1;

grant select on diagnostic_snapshot_context to authenticated;

do $$
begin
  if not exists (select 1 from diagnostic_snapshot_context) then
    raise exception 'Snapshot test requires a completed diagnostic and a platform admin';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', administrator_id::text, true)
from diagnostic_snapshot_context;
set local role authenticated;

do $$
begin
  update public.diagnostics
  set status = 'validated',
      validated_at = now(),
      validated_by = (select administrator_id from diagnostic_snapshot_context)
  where id = (select diagnostic_id from diagnostic_snapshot_context);
  raise sqlstate 'ZX002' using message = 'validation without a snapshot unexpectedly succeeded';
exception
  when others then
    if sqlstate = 'ZX002' then raise; end if;
end;
$$;

select public.validate_diagnostic_snapshot(
  diagnostic_id,
  'sql-test-v1',
  jsonb_build_array(
    jsonb_build_object('dimension_id', 'digital_presence', 'score', null, 'nivel', 'Sin evaluar', 'tipo_resultado', 'sin_evaluar'),
    jsonb_build_object('dimension_id', 'acquisition', 'score', null, 'nivel', 'Sin evaluar', 'tipo_resultado', 'sin_evaluar'),
    jsonb_build_object('dimension_id', 'sales_funnel', 'score', null, 'nivel', 'Sin evaluar', 'tipo_resultado', 'sin_evaluar'),
    jsonb_build_object('dimension_id', 'customer_experience', 'score', null, 'nivel', 'Sin evaluar', 'tipo_resultado', 'sin_evaluar'),
    jsonb_build_object('dimension_id', 'data_automation', 'score', null, 'nivel', 'Sin evaluar', 'tipo_resultado', 'sin_evaluar'),
    jsonb_build_object('dimension_id', 'strategy_enablement', 'score', null, 'nivel', 'Sin evaluar', 'tipo_resultado', 'sin_evaluar')
  ),
  '[]'::jsonb
)
from diagnostic_snapshot_context;

do $$
declare
  v_diagnostic_id uuid := (select diagnostic_id from diagnostic_snapshot_context);
begin
  if (select status from public.diagnostics where id = v_diagnostic_id) <> 'validated' then
    raise exception 'Validation did not advance the diagnostic status';
  end if;
  if (select count(*) from public.assessment_scores where assessment_id = v_diagnostic_id) <> 6 then
    raise exception 'Validation did not persist all dimension snapshots';
  end if;
  if (select count(*) from public.assessment_scores where assessment_id = v_diagnostic_id and tipo_resultado = 'sin_evaluar') <> 6 then
    raise exception 'All-N/A dimensions were not preserved as Sin evaluar';
  end if;
end;
$$;

reset role;

do $$
begin
  update public.assessment_scores
  set nivel = nivel
  where assessment_id = (select diagnostic_id from diagnostic_snapshot_context);
  raise sqlstate 'ZX001' using message = 'snapshot update unexpectedly succeeded';
exception
  when others then
    if sqlstate = 'ZX001' then raise; end if;
end;
$$;

rollback;
