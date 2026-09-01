create table public.company_registrations (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  company_name text not null check (char_length(company_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 320),
  email_normalized text generated always as (lower(btrim(email))) stored,
  status text not null default 'pending' check (status in ('pending', 'linked', 'cancelled')),
  organization_id uuid references public.organizations(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  linked_at timestamptz,
  check (
    (status = 'linked' and organization_id is not null and linked_user_id is not null and linked_at is not null)
    or (status <> 'linked' and organization_id is null and linked_user_id is null and linked_at is null)
  )
);

create unique index company_registrations_active_email_idx
  on public.company_registrations (email_normalized)
  where status in ('pending', 'linked');

create index company_registrations_created_by_idx
  on public.company_registrations (created_by);

create index company_registrations_organization_idx
  on public.company_registrations (organization_id)
  where organization_id is not null;

alter table public.company_registrations enable row level security;

create policy "company_registrations_select_platform_admin"
on public.company_registrations for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  )
);

revoke all on public.company_registrations from anon, authenticated;
grant select on public.company_registrations to authenticated;

create or replace function public.admin_register_company(
  p_contact_name text,
  p_company_name text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_contact_name text := btrim(p_contact_name);
  v_company_name text := btrim(p_company_name);
  v_email text := lower(btrim(p_email));
  v_user_id uuid;
  v_organization_id uuid;
  v_registration_id uuid;
begin
  if v_admin_id is null or not exists (
    select 1 from public.platform_admins where user_id = v_admin_id
  ) then
    raise exception 'Acceso administrativo requerido.' using errcode = '42501';
  end if;

  if char_length(v_contact_name) not between 2 and 120
    or char_length(v_company_name) not between 2 and 120
    or char_length(v_email) not between 5 and 320
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'Revisa el nombre, la empresa y el correo.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.company_registrations
    where email_normalized = v_email and status in ('pending', 'linked')
  ) then
    raise exception 'Ya existe un alta activa para este correo.' using errcode = '23505';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_user_id is not null then
    if exists (
      select 1 from public.organization_memberships where user_id = v_user_id
    ) then
      raise exception 'Este usuario ya está vinculado a una empresa.' using errcode = '23505';
    end if;

    insert into public.profiles (user_id, full_name)
    values (v_user_id, v_contact_name)
    on conflict (user_id) do nothing;

    insert into public.organizations (name, created_by)
    values (v_company_name, v_user_id)
    returning id into v_organization_id;
  end if;

  insert into public.company_registrations (
    contact_name,
    company_name,
    email,
    status,
    organization_id,
    linked_user_id,
    created_by,
    linked_at
  ) values (
    v_contact_name,
    v_company_name,
    v_email,
    case when v_user_id is null then 'pending' else 'linked' end,
    v_organization_id,
    v_user_id,
    v_admin_id,
    case when v_user_id is null then null else now() end
  )
  returning id into v_registration_id;

  return v_registration_id;
end;
$$;

revoke all on function public.admin_register_company(text, text, text) from public, anon;
grant execute on function public.admin_register_company(text, text, text) to authenticated;

create or replace function private.provision_manual_company_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration public.company_registrations%rowtype;
  v_organization_id uuid;
begin
  if new.email is null then
    return new;
  end if;

  select * into v_registration
  from public.company_registrations
  where email_normalized = lower(btrim(new.email))
    and status = 'pending'
  order by created_at
  limit 1
  for update;

  if not found then
    return new;
  end if;

  insert into public.profiles (user_id, full_name)
  values (new.id, v_registration.contact_name)
  on conflict (user_id) do nothing;

  insert into public.organizations (name, created_by)
  values (v_registration.company_name, new.id)
  returning id into v_organization_id;

  update public.company_registrations
  set status = 'linked',
      organization_id = v_organization_id,
      linked_user_id = new.id,
      linked_at = now(),
      updated_at = now()
  where id = v_registration.id;

  return new;
end;
$$;

revoke all on function private.provision_manual_company_registration() from public, anon, authenticated;

create trigger provision_manual_company_after_auth_signup
after insert on auth.users
for each row execute function private.provision_manual_company_registration();
