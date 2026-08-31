create schema if not exists private;

create type public.organization_role as enum (
  'owner',
  'collaborator',
  'nexaro_consultant',
  'nexaro_admin'
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  legal_name text check (legal_name is null or char_length(legal_name) between 2 and 160),
  tax_identifier text check (tax_identifier is null or char_length(tax_identifier) between 3 and 32),
  sector text check (sector is null or char_length(sector) <= 100),
  employee_count integer check (employee_count is null or employee_count between 1 and 1000000),
  city text check (city is null or char_length(city) <= 100),
  country text not null default 'España' check (char_length(country) between 2 and 80),
  website text check (website is null or char_length(website) <= 240),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

create or replace function private.add_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_memberships (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

revoke all on function private.add_organization_owner() from public, anon, authenticated;

create trigger add_organization_owner_after_insert
after insert on public.organizations
for each row execute function private.add_organization_owner();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "memberships_select_own"
on public.organization_memberships for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "organizations_insert_own"
on public.organizations for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "organizations_select_member"
on public.organizations for select
to authenticated
using (
  id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
  )
);

create policy "organizations_update_owner"
on public.organizations for update
to authenticated
using (
  id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'nexaro_admin')
  )
)
with check (
  id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'nexaro_admin')
  )
);

revoke all on public.profiles from anon, authenticated;
revoke all on public.organizations from anon, authenticated;
revoke all on public.organization_memberships from anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (user_id, full_name) on public.profiles to authenticated;
grant update (full_name, updated_at) on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant insert (name, legal_name, tax_identifier, sector, employee_count, city, country, website, created_by)
  on public.organizations to authenticated;
grant update (name, legal_name, tax_identifier, sector, employee_count, city, country, website, updated_at)
  on public.organizations to authenticated;

grant select on public.organization_memberships to authenticated;
