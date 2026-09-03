create table public.auth_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip text not null,
  action text not null check (action in ('login', 'register', 'recover_access')),
  created_at timestamptz not null default now()
);

create index auth_attempts_email_created_at_idx
on public.auth_attempts (email, created_at desc);

alter table public.auth_attempts enable row level security;

-- Authentication attempts are server-only security data. No policy is created
-- intentionally: publishable-key clients cannot read or mutate this table.
revoke all on table public.auth_attempts from public, anon, authenticated;
revoke all on sequence public.auth_attempts_id_seq from public, anon, authenticated;
grant select, insert, delete on table public.auth_attempts to service_role;
grant usage, select on sequence public.auth_attempts_id_seq to service_role;
