begin;

-- This fixture is fully rolled back. It creates a tenant that has no membership
-- for the authenticated user selected below, then proves that RLS hides it.
create temporary table visibility_rls_context as
select
  '5a0f39ca-c37a-4c6f-92d6-09b8f80903f1'::uuid as foreign_organization_id,
  membership.user_id as fixture_creator_id
from public.organization_memberships membership
limit 1;

do $$
begin
  if not exists (select 1 from visibility_rls_context) then
    raise exception 'RLS test requires at least one existing organization member';
  end if;
end;
$$;

insert into public.organizations (id, name, created_by)
select foreign_organization_id, 'Visibility RLS fixture', fixture_creator_id
from visibility_rls_context;

insert into public.visibility_projects (
  organization_id,
  brand_name,
  domain,
  created_by
)
select foreign_organization_id, 'RLS Fixture', 'rls-fixture.invalid', fixture_creator_id
from visibility_rls_context;

select set_config('request.jwt.claim.sub', '65546f49-b220-4b0d-8b62-4ee5d4f2acff', true);
set local role authenticated;

do $$
begin
  if exists (
    select 1
    from public.visibility_projects
    where organization_id = '5a0f39ca-c37a-4c6f-92d6-09b8f80903f1'::uuid
  ) then
    raise exception 'RLS isolation failed: a member can read another tenant';
  end if;
end;
$$;

reset role;
rollback;
