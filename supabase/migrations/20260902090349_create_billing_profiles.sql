create table public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  identification_type text not null
    check (identification_type in ('nif', 'nie', 'cif')),
  tax_identifier text not null
    check (char_length(tax_identifier) between 5 and 32),
  address_line_1 text not null
    check (char_length(address_line_1) between 5 and 180),
  address_line_2 text
    check (address_line_2 is null or char_length(address_line_2) <= 180),
  postal_code text not null
    check (char_length(postal_code) between 3 and 12),
  city text not null
    check (char_length(city) between 2 and 100),
  province text
    check (province is null or char_length(province) <= 100),
  country text not null default 'España'
    check (char_length(country) between 2 and 80),
  phone text
    check (phone is null or char_length(phone) between 6 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_profiles enable row level security;

create policy "Users can read their own billing profile"
on public.billing_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own billing profile"
on public.billing_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own billing profile"
on public.billing_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.billing_profiles from anon, authenticated;
grant select on table public.billing_profiles to authenticated;
grant insert (
  user_id,
  identification_type,
  tax_identifier,
  address_line_1,
  address_line_2,
  postal_code,
  city,
  province,
  country,
  phone
) on public.billing_profiles to authenticated;
grant update (
  identification_type,
  tax_identifier,
  address_line_1,
  address_line_2,
  postal_code,
  city,
  province,
  country,
  phone,
  updated_at
) on public.billing_profiles to authenticated;
