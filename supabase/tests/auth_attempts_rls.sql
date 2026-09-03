begin;

set local role anon;

do $$
begin
  perform 1 from public.auth_attempts limit 1;
  raise exception 'anon must not be able to read auth_attempts';
exception
  when insufficient_privilege then null;
end;
$$;

do $$
begin
  insert into public.auth_attempts (email, ip, action)
  values ('rls-test@example.invalid', '127.0.0.1', 'login');
  raise exception 'anon must not be able to insert auth_attempts';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;
set local role authenticated;

do $$
begin
  perform 1 from public.auth_attempts limit 1;
  raise exception 'authenticated must not be able to read auth_attempts';
exception
  when insufficient_privilege then null;
end;
$$;

do $$
begin
  insert into public.auth_attempts (email, ip, action)
  values ('rls-test@example.invalid', '127.0.0.1', 'login');
  raise exception 'authenticated must not be able to insert auth_attempts';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;
rollback;
