create table public.platform_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text check (email is null or char_length(email) between 3 and 320),
  registered_at timestamptz not null,
  last_sign_in_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null
);

create table public.nexaro_work_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text check (description is null or char_length(description) <= 1200),
  category text not null check (category in (
    'website', 'seo', 'google_profile', 'design', 'campaign',
    'automation', 'consulting', 'maintenance', 'other'
  )),
  completed_on date not null default current_date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index nexaro_work_entries_organization_completed_idx
  on public.nexaro_work_entries (organization_id, completed_on desc, created_at desc);

create or replace function private.sync_platform_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.platform_users (user_id, email, registered_at, last_sign_in_at, updated_at)
  values (new.id, new.email, new.created_at, new.last_sign_in_at, now())
  on conflict (user_id) do update
  set email = excluded.email,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = now();
  return new;
end;
$$;

revoke all on function private.sync_platform_user() from public, anon, authenticated;

create trigger sync_platform_user_after_auth_change
after insert or update of email, last_sign_in_at on auth.users
for each row execute function private.sync_platform_user();

insert into public.platform_users (user_id, email, registered_at, last_sign_in_at)
select id, email, created_at, last_sign_in_at
from auth.users
on conflict (user_id) do update
set email = excluded.email,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = now();

alter table public.platform_users enable row level security;
alter table public.platform_admins enable row level security;
alter table public.nexaro_work_entries enable row level security;

create policy "platform_admins_select_own"
on public.platform_admins for select
to authenticated
using (user_id = (select auth.uid()));

create policy "platform_users_select_own_or_admin"
on public.platform_users for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "profiles_select_platform_admin"
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "memberships_select_platform_admin"
on public.organization_memberships for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "organizations_select_platform_admin"
on public.organizations for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "diagnostics_select_platform_admin"
on public.diagnostics for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "diagnostic_responses_select_platform_admin"
on public.diagnostic_responses for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "work_entries_select_member_or_admin"
on public.nexaro_work_entries for select
to authenticated
using (
  organization_id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "work_entries_insert_admin"
on public.nexaro_work_entries for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "work_entries_update_admin"
on public.nexaro_work_entries for update
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

create policy "work_entries_delete_admin"
on public.nexaro_work_entries for delete
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

revoke all on public.platform_users from anon, authenticated;
revoke all on public.platform_admins from anon, authenticated;
revoke all on public.nexaro_work_entries from anon, authenticated;

grant select on public.platform_users, public.platform_admins to authenticated;
grant select on public.nexaro_work_entries to authenticated;
grant insert (organization_id, title, description, category, completed_on, created_by)
  on public.nexaro_work_entries to authenticated;
grant update (title, description, category, completed_on, updated_at)
  on public.nexaro_work_entries to authenticated;
grant delete on public.nexaro_work_entries to authenticated;
