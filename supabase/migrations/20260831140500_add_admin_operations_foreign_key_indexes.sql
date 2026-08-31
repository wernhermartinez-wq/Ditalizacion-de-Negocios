create index nexaro_work_entries_created_by_idx
  on public.nexaro_work_entries (created_by);

create index platform_admins_granted_by_idx
  on public.platform_admins (granted_by)
  where granted_by is not null;
