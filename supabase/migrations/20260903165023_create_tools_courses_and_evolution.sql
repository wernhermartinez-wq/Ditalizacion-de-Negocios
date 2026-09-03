create table public.tool_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  category text not null check (char_length(category) between 2 and 80),
  provider text check (provider is null or char_length(provider) between 2 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, provider)
);

create table public.organization_tools (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tool_id uuid references public.tool_catalog(id) on delete restrict,
  custom_name text check (custom_name is null or char_length(custom_name) between 2 and 100),
  custom_provider text check (custom_provider is null or char_length(custom_provider) between 2 and 100),
  category text not null check (char_length(category) between 2 and 80),
  usage_purpose text not null check (char_length(usage_purpose) between 3 and 500),
  business_area text not null check (char_length(business_area) between 2 and 100),
  owner_name text check (owner_name is null or char_length(owner_name) between 2 and 120),
  user_count integer check (user_count is null or user_count between 1 and 1000000),
  monthly_cost numeric(12,2) not null default 0 check (monthly_cost >= 0),
  currency char(3) not null default 'EUR',
  criticality text not null default 'medium' check (criticality in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('planned', 'trial', 'active', 'limited', 'retiring', 'retired')),
  verified_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((tool_id is not null and custom_name is null) or (tool_id is null and custom_name is not null)),
  unique (id, organization_id)
);

create unique index organization_tools_catalog_unique_idx
  on public.organization_tools (organization_id, tool_id)
  where tool_id is not null and status <> 'retired';
create index organization_tools_organization_status_idx
  on public.organization_tools (organization_id, status, created_at desc);
create index organization_tools_tool_id_idx on public.organization_tools (tool_id);

create table public.tool_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_tool_id uuid not null,
  target_tool_id uuid not null,
  method text not null check (char_length(method) between 2 and 120),
  status text not null default 'active' check (status in ('planned', 'active', 'degraded', 'broken', 'retired')),
  last_verified_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_tool_id, organization_id)
    references public.organization_tools(id, organization_id) on delete cascade,
  foreign key (target_tool_id, organization_id)
    references public.organization_tools(id, organization_id) on delete cascade,
  check (source_tool_id <> target_tool_id),
  unique (organization_id, source_tool_id, target_tool_id)
);

create index tool_integrations_organization_status_idx
  on public.tool_integrations (organization_id, status, created_at desc);
create index tool_integrations_source_idx on public.tool_integrations (source_tool_id);
create index tool_integrations_target_idx on public.tool_integrations (target_tool_id);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null check (char_length(summary) between 10 and 800),
  level text not null check (level in ('introductory', 'intermediate', 'advanced')),
  duration_minutes integer not null check (duration_minutes between 15 and 10000),
  modality text not null check (modality in ('self_paced', 'live', 'blended')),
  provider text not null default 'Nexaro' check (char_length(provider) between 2 and 100),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_competencies (
  course_id uuid not null references public.courses(id) on delete cascade,
  dimension_id text not null,
  competency text not null check (char_length(competency) between 3 and 180),
  created_at timestamptz not null default now(),
  primary key (course_id, dimension_id, competency)
);

create index course_competencies_dimension_idx
  on public.course_competencies (dimension_id, course_id);

create table public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  assessment_id uuid references public.diagnostics(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  due_date date,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed')),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, course_id)
);

create index course_assignments_organization_status_idx
  on public.course_assignments (organization_id, status, created_at desc);
create index course_assignments_user_idx on public.course_assignments (user_id, status);
create index course_assignments_course_idx on public.course_assignments (course_id);
create index course_assignments_assessment_idx on public.course_assignments (assessment_id);

create table public.course_progress (
  assignment_id uuid primary key references public.course_assignments(id) on delete cascade,
  percentage smallint not null default 0 check (percentage between 0 and 100),
  evaluation text check (evaluation is null or char_length(evaluation) <= 800),
  evidence text check (evidence is null or char_length(evidence) <= 500),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((percentage = 100 and completed_at is not null) or (percentage < 100 and completed_at is null))
);

alter table public.tool_catalog enable row level security;
alter table public.organization_tools enable row level security;
alter table public.tool_integrations enable row level security;
alter table public.courses enable row level security;
alter table public.course_competencies enable row level security;
alter table public.course_assignments enable row level security;
alter table public.course_progress enable row level security;

create policy "Authenticated users read the tool catalog"
on public.tool_catalog for select to authenticated
using (is_active or (select private.is_platform_admin()));
create policy "Admins insert tool catalog entries"
on public.tool_catalog for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Admins update tool catalog entries"
on public.tool_catalog for update to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Admins delete tool catalog entries"
on public.tool_catalog for delete to authenticated
using ((select private.is_platform_admin()));

create policy "Members and admins read organization tools"
on public.organization_tools for select to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()));
create policy "Members and admins add organization tools"
on public.organization_tools for insert to authenticated
with check (
  (private.is_organization_member(organization_id) and created_by = (select auth.uid()))
  or (select private.is_platform_admin())
);
create policy "Members and admins update organization tools"
on public.organization_tools for update to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()))
with check (private.is_organization_member(organization_id) or (select private.is_platform_admin()));
create policy "Members and admins delete organization tools"
on public.organization_tools for delete to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()));

create policy "Members and admins read tool integrations"
on public.tool_integrations for select to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()));
create policy "Members and admins add tool integrations"
on public.tool_integrations for insert to authenticated
with check (
  (private.is_organization_member(organization_id) and created_by = (select auth.uid()))
  or (select private.is_platform_admin())
);
create policy "Members and admins update tool integrations"
on public.tool_integrations for update to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()))
with check (private.is_organization_member(organization_id) or (select private.is_platform_admin()));
create policy "Members and admins delete tool integrations"
on public.tool_integrations for delete to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()));

create policy "Authenticated users read published courses"
on public.courses for select to authenticated
using (status = 'published' or (select private.is_platform_admin()));
create policy "Admins insert courses"
on public.courses for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Admins update courses"
on public.courses for update to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));
create policy "Admins delete courses"
on public.courses for delete to authenticated
using ((select private.is_platform_admin()));

create policy "Authenticated users read published course competencies"
on public.course_competencies for select to authenticated
using (
  exists (
    select 1 from public.courses course
    where course.id = course_id
      and (course.status = 'published' or (select private.is_platform_admin()))
  )
);
create policy "Admins manage course competencies"
on public.course_competencies for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));

create policy "Members and admins read course assignments"
on public.course_assignments for select to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()));
create policy "Users and admins create course assignments"
on public.course_assignments for insert to authenticated
with check (
  (
    private.is_organization_member(organization_id)
    and user_id = (select auth.uid())
    and assigned_by = (select auth.uid())
  )
  or (select private.is_platform_admin())
);
create policy "Users and admins update course assignments"
on public.course_assignments for update to authenticated
using (
  (private.is_organization_member(organization_id) and user_id = (select auth.uid()))
  or (select private.is_platform_admin())
)
with check (
  (private.is_organization_member(organization_id) and user_id = (select auth.uid()))
  or (select private.is_platform_admin())
);
create policy "Users and admins delete course assignments"
on public.course_assignments for delete to authenticated
using (
  (private.is_organization_member(organization_id) and user_id = (select auth.uid()))
  or (select private.is_platform_admin())
);

create policy "Members and admins read course progress"
on public.course_progress for select to authenticated
using (
  exists (
    select 1 from public.course_assignments assignment
    where assignment.id = assignment_id
      and (
        private.is_organization_member(assignment.organization_id)
        or (select private.is_platform_admin())
      )
  )
);
create policy "Users and admins create course progress"
on public.course_progress for insert to authenticated
with check (
  exists (
    select 1 from public.course_assignments assignment
    where assignment.id = assignment_id
      and (
        (private.is_organization_member(assignment.organization_id) and assignment.user_id = (select auth.uid()))
        or (select private.is_platform_admin())
      )
  )
);
create policy "Users and admins update course progress"
on public.course_progress for update to authenticated
using (
  exists (
    select 1 from public.course_assignments assignment
    where assignment.id = assignment_id
      and (
        (private.is_organization_member(assignment.organization_id) and assignment.user_id = (select auth.uid()))
        or (select private.is_platform_admin())
      )
  )
)
with check (
  exists (
    select 1 from public.course_assignments assignment
    where assignment.id = assignment_id
      and (
        (private.is_organization_member(assignment.organization_id) and assignment.user_id = (select auth.uid()))
        or (select private.is_platform_admin())
      )
  )
);

create or replace function public.update_course_progress(
  p_assignment_id uuid,
  p_percentage smallint,
  p_evaluation text default null,
  p_evidence text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assignment_id uuid;
begin
  if p_percentage < 0 or p_percentage > 100 then
    raise exception 'Course progress must be between 0 and 100';
  end if;

  update public.course_assignments assignment
  set status = case
        when p_percentage = 100 then 'completed'
        when p_percentage > 0 then 'in_progress'
        else 'assigned'
      end,
      updated_at = now()
  where assignment.id = p_assignment_id
    and (
      (
        assignment.user_id = (select auth.uid())
        and private.is_organization_member(assignment.organization_id)
      )
      or (select private.is_platform_admin())
    )
  returning assignment.id into v_assignment_id;

  if v_assignment_id is null then
    raise exception 'Course assignment is not available';
  end if;

  insert into public.course_progress (
    assignment_id, percentage, evaluation, evidence, completed_at
  ) values (
    v_assignment_id,
    p_percentage,
    nullif(trim(p_evaluation), ''),
    nullif(trim(p_evidence), ''),
    case when p_percentage = 100 then now() else null end
  )
  on conflict (assignment_id) do update
  set percentage = excluded.percentage,
      evaluation = excluded.evaluation,
      evidence = excluded.evidence,
      completed_at = excluded.completed_at,
      updated_at = now();
end;
$$;

revoke all on function public.update_course_progress(uuid, smallint, text, text) from public, anon;
grant execute on function public.update_course_progress(uuid, smallint, text, text) to authenticated;

revoke all on public.tool_catalog, public.organization_tools, public.tool_integrations,
  public.courses, public.course_competencies, public.course_assignments, public.course_progress
  from public, anon, authenticated;

grant select on public.tool_catalog, public.courses, public.course_competencies to authenticated;
grant insert (name, category, provider, is_active) on public.tool_catalog to authenticated;
grant update (name, category, provider, is_active) on public.tool_catalog to authenticated;
grant delete on public.tool_catalog to authenticated;
grant select, delete on public.organization_tools, public.tool_integrations, public.course_assignments to authenticated;
grant insert (
  organization_id, tool_id, custom_name, custom_provider, category, usage_purpose,
  business_area, owner_name, user_count, monthly_cost, currency, criticality,
  status, verified_at, created_by
) on public.organization_tools to authenticated;
grant update (
  custom_name, custom_provider, category, usage_purpose, business_area, owner_name,
  user_count, monthly_cost, currency, criticality, status, verified_at, updated_at
) on public.organization_tools to authenticated;
grant insert (
  organization_id, source_tool_id, target_tool_id, method, status, last_verified_at, created_by
) on public.tool_integrations to authenticated;
grant update (method, status, last_verified_at, updated_at) on public.tool_integrations to authenticated;
grant insert (slug, title, summary, level, duration_minutes, modality, provider, status)
  on public.courses to authenticated;
grant update (slug, title, summary, level, duration_minutes, modality, provider, status, updated_at)
  on public.courses to authenticated;
grant delete on public.courses to authenticated;
grant insert, update, delete on public.course_competencies to authenticated;
grant insert (
  organization_id, user_id, course_id, assessment_id, reason, due_date, status, assigned_by
) on public.course_assignments to authenticated;
grant update (reason, due_date, status, updated_at) on public.course_assignments to authenticated;
grant select on public.course_progress to authenticated;
grant insert (assignment_id, percentage, evaluation, evidence, completed_at)
  on public.course_progress to authenticated;
grant update (percentage, evaluation, evidence, completed_at, updated_at)
  on public.course_progress to authenticated;

insert into public.tool_catalog (name, category, provider) values
  ('Microsoft 365', 'Productividad', 'Microsoft'),
  ('Google Workspace', 'Productividad', 'Google'),
  ('Holded', 'Gestión empresarial', 'Holded'),
  ('HubSpot', 'CRM y ventas', 'HubSpot'),
  ('Mailchimp', 'Marketing', 'Intuit'),
  ('Canva', 'Diseño', 'Canva'),
  ('Slack', 'Comunicación', 'Salesforce'),
  ('Trello', 'Gestión de proyectos', 'Atlassian'),
  ('Zapier', 'Automatización', 'Zapier'),
  ('ChatGPT Team', 'Inteligencia artificial', 'OpenAI')
on conflict (name, provider) do nothing;

insert into public.courses (slug, title, summary, level, duration_minutes, modality) values
  ('presencia-digital-que-convierte', 'Presencia digital que convierte', 'Organiza web, ficha de empresa y contenidos para que cada canal ayude a descubrir y contactar con el negocio.', 'introductory', 75, 'self_paced'),
  ('captacion-digital-medible', 'Captación digital medible', 'Define campañas, fuentes y métricas sencillas para saber qué acciones generan oportunidades reales.', 'intermediate', 90, 'self_paced'),
  ('crm-y-seguimiento-comercial', 'CRM y seguimiento comercial', 'Construye un proceso comercial visible, con responsables, estados y próximos pasos para cada oportunidad.', 'introductory', 80, 'self_paced'),
  ('experiencia-y-fidelizacion', 'Experiencia y fidelización', 'Diseña una rutina práctica para escuchar al cliente, resolver incidencias y activar nuevas compras.', 'intermediate', 70, 'self_paced'),
  ('automatizacion-sin-caos', 'Automatización sin caos', 'Detecta tareas repetitivas, prepara datos fiables y automatiza con controles que evitan errores silenciosos.', 'intermediate', 105, 'blended'),
  ('estrategia-digital-en-90-dias', 'Estrategia digital en 90 días', 'Convierte prioridades digitales en responsables, indicadores y una cadencia de revisión sostenible.', 'introductory', 65, 'self_paced')
on conflict (slug) do nothing;

insert into public.course_competencies (course_id, dimension_id, competency)
select course.id, competency.dimension_id, competency.competency
from public.courses course
join (values
  ('presencia-digital-que-convierte', 'digital_presence', 'Canales digitales y conversión'),
  ('captacion-digital-medible', 'acquisition', 'Campañas, fuentes y medición'),
  ('crm-y-seguimiento-comercial', 'sales_funnel', 'Proceso comercial y CRM'),
  ('experiencia-y-fidelizacion', 'customer_experience', 'Escucha, servicio y fidelización'),
  ('automatizacion-sin-caos', 'data_automation', 'Calidad de datos y automatización'),
  ('estrategia-digital-en-90-dias', 'strategy_enablement', 'Gobierno, capacidades e indicadores')
) as competency(slug, dimension_id, competency) on competency.slug = course.slug
on conflict (course_id, dimension_id, competency) do nothing;
