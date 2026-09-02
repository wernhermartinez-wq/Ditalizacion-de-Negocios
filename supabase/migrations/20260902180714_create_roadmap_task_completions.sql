create table public.roadmap_task_completions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  task_key text not null check (char_length(task_key) between 3 and 32),
  title text not null check (char_length(title) between 3 and 300),
  completed_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz not null default now(),
  unique (diagnostic_id, task_key)
);

create index roadmap_task_completions_organization_idx
on public.roadmap_task_completions (organization_id, completed_at desc);

alter table public.roadmap_task_completions enable row level security;

create policy "Organization members can read completed roadmap tasks"
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
);

create policy "Organization members can complete roadmap tasks"
on public.roadmap_task_completions
for insert
to authenticated
with check (
  completed_by = (select auth.uid())
  and exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = roadmap_task_completions.organization_id
      and membership.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.diagnostics as diagnostic
    where diagnostic.id = roadmap_task_completions.diagnostic_id
      and diagnostic.organization_id = roadmap_task_completions.organization_id
      and diagnostic.status = 'completed'
  )
);

create policy "Organization members can reopen completed roadmap tasks"
on public.roadmap_task_completions
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = roadmap_task_completions.organization_id
      and membership.user_id = (select auth.uid())
  )
);

revoke all on table public.roadmap_task_completions from anon, authenticated;
grant select, delete on table public.roadmap_task_completions to authenticated;
grant insert (
  organization_id,
  diagnostic_id,
  task_key,
  title,
  completed_by
) on public.roadmap_task_completions to authenticated;
