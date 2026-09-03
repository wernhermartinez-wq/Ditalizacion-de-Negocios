create or replace function private.enforce_diagnostic_validation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'validated' and (
    new.status is distinct from old.status
    or new.validated_at is distinct from old.validated_at
    or new.validated_by is distinct from old.validated_by
    or new.provisional_score is distinct from old.provisional_score
  ) then
    raise exception 'Validated diagnostics cannot be changed';
  end if;

  if new.status = 'validated' and old.status <> 'validated' then
    if new.validated_by is distinct from (select auth.uid())
      or not (select private.is_platform_admin()) then
      raise exception 'Only a platform administrator can validate a diagnostic';
    end if;

    if not exists (
      select 1
      from public.assessment_scores score
      where score.assessment_id = new.id
      group by score.assessment_id
      having count(*) = 6
        and count(*) filter (
          where score.dimension_id in (
            'digital_presence',
            'acquisition',
            'sales_funnel',
            'customer_experience',
            'data_automation',
            'strategy_enablement'
          )
        ) = 6
        and count(distinct score.formula_version) = 1
    ) or not exists (
      select 1
      from public.roadmaps roadmap
      where roadmap.assessment_id = new.id
        and roadmap.organization_id = new.organization_id
        and roadmap.validated_by = new.validated_by
    ) then
      raise exception 'A validated diagnostic requires a complete immutable snapshot';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_diagnostic_validation() from public, anon, authenticated;
