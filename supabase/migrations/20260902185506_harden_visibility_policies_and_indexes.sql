drop policy if exists "Admins manage visibility competitors" on public.visibility_competitors;
drop policy if exists "Admins manage visibility prompts" on public.visibility_prompts;
drop policy if exists "Admins manage visibility runs" on public.visibility_runs;
drop policy if exists "Admins manage visibility responses" on public.visibility_responses;
drop policy if exists "Admins manage visibility mentions" on public.visibility_mentions;
drop policy if exists "Admins manage visibility citations" on public.visibility_citations;
drop policy if exists "Admins manage visibility metrics" on public.visibility_metric_snapshots;
drop policy if exists "Admins manage visibility recommendations" on public.visibility_recommendations;
drop policy if exists "Admins manage visibility usage" on public.visibility_usage_events;
drop policy if exists "Admins manage visibility reports" on public.visibility_reports;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'visibility_competitors',
    'visibility_prompts',
    'visibility_runs',
    'visibility_responses',
    'visibility_mentions',
    'visibility_citations',
    'visibility_metric_snapshots',
    'visibility_recommendations',
    'visibility_usage_events',
    'visibility_reports'
  ]
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.is_platform_admin())',
      'Admins insert ' || target_table,
      target_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin())',
      'Admins update ' || target_table,
      target_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.is_platform_admin())',
      'Admins delete ' || target_table,
      target_table
    );
  end loop;
end;
$$;

create index nexaro_tasks_completed_by_idx on public.nexaro_tasks (completed_by) where completed_by is not null;
create index nexaro_tasks_created_by_idx on public.nexaro_tasks (created_by);
create index visibility_projects_created_by_idx on public.visibility_projects (created_by);
create index visibility_prompts_approved_by_idx on public.visibility_prompts (approved_by) where approved_by is not null;
create index visibility_prompts_created_by_idx on public.visibility_prompts (created_by);
create index visibility_recommendations_created_by_idx on public.visibility_recommendations (created_by) where created_by is not null;
create index visibility_recommendations_task_idx on public.visibility_recommendations (nexaro_task_id) where nexaro_task_id is not null;
create index visibility_recommendations_run_idx on public.visibility_recommendations (run_id);
create index visibility_reports_generated_by_idx on public.visibility_reports (generated_by) where generated_by is not null;
create index visibility_reports_run_idx on public.visibility_reports (run_id) where run_id is not null;
create index visibility_runs_created_by_idx on public.visibility_runs (created_by) where created_by is not null;
create index visibility_usage_run_idx on public.visibility_usage_events (run_id);
