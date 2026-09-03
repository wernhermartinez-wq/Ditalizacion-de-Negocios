-- RLS helper functions live outside the exposed public schema. Authenticated
-- users need schema USAGE to evaluate policies, but only explicitly granted
-- functions remain callable.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

drop policy if exists "Admins manage Nexaro tasks" on public.nexaro_tasks;

create policy "Admins create Nexaro tasks"
on public.nexaro_tasks for insert to authenticated
with check (
  private.is_platform_admin()
  and created_by = (select auth.uid())
);

create policy "Admins update Nexaro tasks"
on public.nexaro_tasks for update to authenticated
using (private.is_platform_admin())
with check (private.is_platform_admin());

create policy "Admins delete Nexaro tasks"
on public.nexaro_tasks for delete to authenticated
using (private.is_platform_admin());

drop policy if exists "Admins manage visibility projects" on public.visibility_projects;

create policy "Admins create visibility projects"
on public.visibility_projects for insert to authenticated
with check (
  private.is_platform_admin()
  and created_by = (select auth.uid())
);

create policy "Admins update visibility projects"
on public.visibility_projects for update to authenticated
using (private.is_platform_admin())
with check (private.is_platform_admin());

create policy "Admins delete visibility projects"
on public.visibility_projects for delete to authenticated
using (private.is_platform_admin());
