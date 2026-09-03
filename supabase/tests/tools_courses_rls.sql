begin;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'tool_catalog', 'organization_tools', 'tool_integrations',
    'courses', 'course_competencies', 'course_assignments', 'course_progress'
  ] loop
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
declare
  v_table text;
begin
  foreach v_table in array array[
    'tool_catalog', 'organization_tools', 'tool_integrations',
    'courses', 'course_competencies', 'course_assignments', 'course_progress'
  ] loop
    if has_table_privilege('anon', format('public.%I', v_table), 'SELECT')
      or has_table_privilege('anon', format('public.%I', v_table), 'INSERT')
      or has_table_privilege('anon', format('public.%I', v_table), 'UPDATE')
      or has_table_privilege('anon', format('public.%I', v_table), 'DELETE') then
      raise exception 'anon unexpectedly has privileges on public.%', v_table;
    end if;
  end loop;
end;
$$;

reset role;

do $$
begin
  if not has_table_privilege('authenticated', 'public.tool_catalog', 'SELECT')
    or not has_table_privilege('authenticated', 'public.organization_tools', 'SELECT')
    or not has_table_privilege('authenticated', 'public.course_assignments', 'SELECT')
    or not has_table_privilege('authenticated', 'public.course_progress', 'SELECT') then
    raise exception 'authenticated is missing required read privileges';
  end if;
end;
$$;

rollback;
