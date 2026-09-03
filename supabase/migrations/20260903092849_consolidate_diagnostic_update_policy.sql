drop policy "diagnostics_update_member" on public.diagnostics;
drop policy "Admins update diagnostics for validation" on public.diagnostics;

create policy "Members update drafts and admins validate diagnostics"
on public.diagnostics for update to authenticated
using (
  (select private.is_platform_admin())
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = diagnostics.organization_id
      and membership.user_id = (select auth.uid())
  )
)
with check (
  (select private.is_platform_admin())
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = diagnostics.organization_id
      and membership.user_id = (select auth.uid())
  )
);
