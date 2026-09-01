create index company_registrations_linked_user_idx
  on public.company_registrations (linked_user_id)
  where linked_user_id is not null;
