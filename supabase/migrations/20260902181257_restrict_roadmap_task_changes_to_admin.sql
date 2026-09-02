drop policy "Organization members can read completed roadmap tasks" on public.roadmap_task_completions;
drop policy "Organization members can complete roadmap tasks" on public.roadmap_task_completions;
drop policy "Organization members can reopen completed roadmap tasks" on public.roadmap_task_completions;

create policy "Members and admins can read completed roadmap tasks"
on public.roadmap_task_completions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = roadmap_task_completions.organization_id
      and membership.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.platform_admins as administrator
    where administrator.user_id = (select auth.uid())
  )
);

create policy "Only Nexaro admins can complete roadmap tasks"
on public.roadmap_task_completions
for insert
to authenticated
with check (
  completed_by = (select auth.uid())
  and exists (
    select 1
    from public.platform_admins as administrator
    where administrator.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.diagnostics as diagnostic
    where diagnostic.id = roadmap_task_completions.diagnostic_id
      and diagnostic.organization_id = roadmap_task_completions.organization_id
      and diagnostic.status = 'completed'
  )
);

create policy "Only Nexaro admins can reopen completed roadmap tasks"
on public.roadmap_task_completions
for delete
to authenticated
using (
  exists (
    select 1
    from public.platform_admins as administrator
    where administrator.user_id = (select auth.uid())
  )
);
