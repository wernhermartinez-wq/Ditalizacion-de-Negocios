create table public.nexaro_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'diagnostic', 'visibility')),
  source_reference text,
  title text not null check (char_length(title) between 3 and 180),
  description text check (description is null or char_length(description) <= 1800),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  completed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source, source_reference)
);

create table public.visibility_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  brand_name text not null check (char_length(brand_name) between 2 and 120),
  brand_variants text[] not null default '{}',
  domain text not null check (char_length(domain) between 3 and 253),
  services text[] not null default '{}',
  business_description text check (business_description is null or char_length(business_description) <= 2000),
  target_audience text check (target_audience is null or char_length(target_audience) <= 1000),
  country text not null default 'ES' check (char_length(country) = 2),
  region text,
  primary_language text not null default 'es' check (primary_language in ('es', 'de')),
  secondary_languages text[] not null default '{}',
  objectives text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  schedule_frequency text not null default 'weekly' check (schedule_frequency in ('manual', 'weekly')),
  next_run_at timestamptz,
  gsc_property_url text,
  gsc_status text not null default 'not_configured' check (gsc_status in ('not_configured', 'pending', 'connected', 'error')),
  settings jsonb not null default '{"max_competitors":3,"max_active_prompts":25}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visibility_competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visibility_projects(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  domain text not null check (char_length(domain) between 3 and 253),
  name_variants text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, domain)
);

create table public.visibility_prompts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visibility_projects(id) on delete cascade,
  question text not null check (char_length(question) between 10 and 800),
  country text not null default 'ES' check (char_length(country) = 2),
  language text not null default 'es' check (language in ('es', 'de')),
  status text not null default 'suggested' check (status in ('suggested', 'approved', 'inactive')),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'approved' and approved_at is not null) or status <> 'approved')
);

create table public.visibility_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visibility_projects(id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 180),
  trigger_type text not null check (trigger_type in ('manual', 'scheduled')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'partial', 'failed')),
  requested_providers text[] not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, idempotency_key)
);

create table public.visibility_responses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.visibility_runs(id) on delete cascade,
  prompt_id uuid not null references public.visibility_prompts(id) on delete cascade,
  provider text not null check (provider in ('openai', 'gemini', 'perplexity')),
  model text,
  model_version text,
  country text not null check (char_length(country) = 2),
  language text not null check (language in ('es', 'de')),
  original_response text,
  status text not null check (status in ('completed', 'not_configured', 'failed')),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost numeric(12,6) check (estimated_cost is null or estimated_cost >= 0),
  sentiment text check (sentiment is null or sentiment in ('positive', 'neutral', 'negative')),
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  needs_review boolean not null default false,
  error_message text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, prompt_id, provider)
);

create table public.visibility_mentions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.visibility_responses(id) on delete cascade,
  competitor_id uuid references public.visibility_competitors(id) on delete set null,
  entity_type text not null check (entity_type in ('client', 'competitor')),
  entity_name text not null,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  attributes text[] not null default '{}',
  evidence text,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.visibility_citations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.visibility_responses(id) on delete cascade,
  url text not null,
  domain text not null,
  title text,
  snippet text,
  position integer check (position is null or position > 0),
  is_client_domain boolean not null default false,
  is_external_authority boolean not null default false,
  created_at timestamptz not null default now(),
  unique (response_id, url)
);

create table public.visibility_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visibility_projects(id) on delete cascade,
  run_id uuid not null references public.visibility_runs(id) on delete cascade,
  provider text,
  model text,
  country text,
  language text,
  metrics jsonb not null,
  generated_at timestamptz not null default now(),
  unique (run_id, provider, country, language)
);

create table public.visibility_recommendations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visibility_projects(id) on delete cascade,
  run_id uuid references public.visibility_runs(id) on delete set null,
  title text not null check (char_length(title) between 3 and 180),
  reason text not null check (char_length(reason) between 10 and 1600),
  evidence text not null check (char_length(evidence) between 3 and 2000),
  impact text not null check (char_length(impact) between 3 and 1000),
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'accepted', 'task_created', 'dismissed')),
  related_prompt_ids uuid[] not null default '{}',
  related_response_ids uuid[] not null default '{}',
  nexaro_task_id uuid references public.nexaro_tasks(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visibility_usage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visibility_projects(id) on delete cascade,
  run_id uuid references public.visibility_runs(id) on delete set null,
  provider text not null check (provider in ('openai', 'gemini', 'perplexity', 'gsc')),
  event_type text not null check (event_type in ('request', 'search', 'report')),
  quantity integer not null default 1 check (quantity > 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost numeric(12,6) check (estimated_cost is null or estimated_cost >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.visibility_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visibility_projects(id) on delete cascade,
  run_id uuid references public.visibility_runs(id) on delete set null,
  title text not null check (char_length(title) between 3 and 180),
  period_start date,
  period_end date,
  status text not null default 'ready' check (status in ('ready', 'archived')),
  snapshot jsonb not null default '{}'::jsonb,
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index nexaro_tasks_organization_status_idx on public.nexaro_tasks (organization_id, status, created_at desc);
create index visibility_prompts_project_status_idx on public.visibility_prompts (project_id, status, active);
create index visibility_runs_project_created_idx on public.visibility_runs (project_id, created_at desc);
create index visibility_responses_run_idx on public.visibility_responses (run_id, provider);
create index visibility_responses_prompt_idx on public.visibility_responses (prompt_id, created_at desc);
create index visibility_mentions_response_idx on public.visibility_mentions (response_id);
create index visibility_mentions_competitor_idx on public.visibility_mentions (competitor_id) where competitor_id is not null;
create index visibility_citations_response_idx on public.visibility_citations (response_id, position);
create index visibility_metrics_project_generated_idx on public.visibility_metric_snapshots (project_id, generated_at desc);
create index visibility_recommendations_project_status_idx on public.visibility_recommendations (project_id, status, priority);
create index visibility_usage_project_created_idx on public.visibility_usage_events (project_id, created_at desc);
create index visibility_reports_project_created_idx on public.visibility_reports (project_id, created_at desc);

alter table public.nexaro_tasks enable row level security;
alter table public.visibility_projects enable row level security;
alter table public.visibility_competitors enable row level security;
alter table public.visibility_prompts enable row level security;
alter table public.visibility_runs enable row level security;
alter table public.visibility_responses enable row level security;
alter table public.visibility_mentions enable row level security;
alter table public.visibility_citations enable row level security;
alter table public.visibility_metric_snapshots enable row level security;
alter table public.visibility_recommendations enable row level security;
alter table public.visibility_usage_events enable row level security;
alter table public.visibility_reports enable row level security;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins administrator
    where administrator.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.is_organization_member(uuid) from public, anon;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;

create policy "Members and admins can read Nexaro tasks" on public.nexaro_tasks for select to authenticated
using (private.is_organization_member(organization_id) or private.is_platform_admin());
create policy "Admins manage Nexaro tasks" on public.nexaro_tasks for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin() and created_by = (select auth.uid()));

create policy "Members and admins read visibility projects" on public.visibility_projects for select to authenticated
using (private.is_organization_member(organization_id) or private.is_platform_admin());
create policy "Admins manage visibility projects" on public.visibility_projects for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin() and created_by = (select auth.uid()));

create policy "Members and admins read visibility competitors" on public.visibility_competitors for select to authenticated
using (exists (select 1 from public.visibility_projects project where project.id = project_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility competitors" on public.visibility_competitors for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility prompts" on public.visibility_prompts for select to authenticated
using (exists (select 1 from public.visibility_projects project where project.id = project_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility prompts" on public.visibility_prompts for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "Members and admins read visibility runs" on public.visibility_runs for select to authenticated
using (exists (select 1 from public.visibility_projects project where project.id = project_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility runs" on public.visibility_runs for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility responses" on public.visibility_responses for select to authenticated
using (exists (select 1 from public.visibility_runs run join public.visibility_projects project on project.id = run.project_id where run.id = run_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility responses" on public.visibility_responses for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility mentions" on public.visibility_mentions for select to authenticated
using (exists (select 1 from public.visibility_responses response join public.visibility_runs run on run.id = response.run_id join public.visibility_projects project on project.id = run.project_id where response.id = response_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility mentions" on public.visibility_mentions for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility citations" on public.visibility_citations for select to authenticated
using (exists (select 1 from public.visibility_responses response join public.visibility_runs run on run.id = response.run_id join public.visibility_projects project on project.id = run.project_id where response.id = response_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility citations" on public.visibility_citations for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility metrics" on public.visibility_metric_snapshots for select to authenticated
using (exists (select 1 from public.visibility_projects project where project.id = project_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility metrics" on public.visibility_metric_snapshots for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility recommendations" on public.visibility_recommendations for select to authenticated
using (exists (select 1 from public.visibility_projects project where project.id = project_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility recommendations" on public.visibility_recommendations for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility usage" on public.visibility_usage_events for select to authenticated
using (exists (select 1 from public.visibility_projects project where project.id = project_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility usage" on public.visibility_usage_events for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "Members and admins read visibility reports" on public.visibility_reports for select to authenticated
using (exists (select 1 from public.visibility_projects project where project.id = project_id and (private.is_organization_member(project.organization_id) or private.is_platform_admin())));
create policy "Admins manage visibility reports" on public.visibility_reports for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

revoke all on public.nexaro_tasks, public.visibility_projects, public.visibility_competitors,
  public.visibility_prompts, public.visibility_runs, public.visibility_responses,
  public.visibility_mentions, public.visibility_citations, public.visibility_metric_snapshots,
  public.visibility_recommendations, public.visibility_usage_events, public.visibility_reports
from anon, authenticated;

grant select on public.nexaro_tasks, public.visibility_projects, public.visibility_competitors,
  public.visibility_prompts, public.visibility_runs, public.visibility_responses,
  public.visibility_mentions, public.visibility_citations, public.visibility_metric_snapshots,
  public.visibility_recommendations, public.visibility_usage_events, public.visibility_reports
to authenticated;

grant insert, update, delete on public.nexaro_tasks, public.visibility_projects, public.visibility_competitors,
  public.visibility_prompts, public.visibility_runs, public.visibility_responses,
  public.visibility_mentions, public.visibility_citations, public.visibility_metric_snapshots,
  public.visibility_recommendations, public.visibility_usage_events, public.visibility_reports
to authenticated;

comment on table public.visibility_responses is 'Immutable provider output plus normalized execution metadata. Original response text is preserved for auditability.';
comment on table public.visibility_metric_snapshots is 'Traceable metric snapshots. JSON contains formulas and numerator/denominator evidence for each metric.';
