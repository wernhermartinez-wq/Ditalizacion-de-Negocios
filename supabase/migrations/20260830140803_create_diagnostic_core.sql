create table public.diagnostic_questionnaires (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  version integer not null check (version > 0),
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 10 and 600),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

create unique index diagnostic_questionnaires_one_active_idx
  on public.diagnostic_questionnaires (is_active)
  where is_active;

create table public.diagnostic_questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.diagnostic_questionnaires(id) on delete cascade,
  dimension text not null check (dimension in (
    'digital_strategy',
    'digital_readiness',
    'digital_skills',
    'data_management',
    'automation_intelligence',
    'green_digitalisation'
  )),
  prompt text not null check (char_length(prompt) between 10 and 400),
  position smallint not null check (position > 0),
  required boolean not null default true,
  unique (questionnaire_id, position)
);

create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  questionnaire_id uuid not null references public.diagnostic_questionnaires(id),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  started_by uuid not null references auth.users(id),
  provisional_score numeric(5,2) check (provisional_score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'draft' and completed_at is null)
    or (status = 'completed' and completed_at is not null and provisional_score is not null)
  )
);

create unique index diagnostics_one_draft_per_org_idx
  on public.diagnostics (organization_id, questionnaire_id)
  where status = 'draft';
create index diagnostics_organization_created_idx
  on public.diagnostics (organization_id, created_at desc);
create index diagnostics_questionnaire_id_idx
  on public.diagnostics (questionnaire_id);
create index diagnostics_started_by_idx
  on public.diagnostics (started_by);

create table public.diagnostic_responses (
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  question_id uuid not null references public.diagnostic_questions(id),
  value smallint not null check (value between 1 and 5),
  answered_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (diagnostic_id, question_id)
);

create index diagnostic_responses_question_id_idx
  on public.diagnostic_responses (question_id);
create index diagnostic_responses_answered_by_idx
  on public.diagnostic_responses (answered_by);

alter table public.diagnostic_questionnaires enable row level security;
alter table public.diagnostic_questions enable row level security;
alter table public.diagnostics enable row level security;
alter table public.diagnostic_responses enable row level security;

create policy "diagnostic_questionnaires_select_authenticated"
on public.diagnostic_questionnaires for select
to authenticated
using (true);

create policy "diagnostic_questions_select_authenticated"
on public.diagnostic_questions for select
to authenticated
using (true);

create policy "diagnostics_select_member"
on public.diagnostics for select
to authenticated
using (
  organization_id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
  )
);

create policy "diagnostics_insert_member"
on public.diagnostics for insert
to authenticated
with check (
  started_by = (select auth.uid())
  and organization_id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
  )
);

create policy "diagnostics_update_member"
on public.diagnostics for update
to authenticated
using (
  organization_id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
  )
)
with check (
  organization_id in (
    select membership.organization_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
  )
);

create policy "diagnostic_responses_select_member"
on public.diagnostic_responses for select
to authenticated
using (
  diagnostic_id in (
    select diagnostic.id
    from public.diagnostics as diagnostic
    where diagnostic.organization_id in (
      select membership.organization_id
      from public.organization_memberships as membership
      where membership.user_id = (select auth.uid())
    )
  )
);

create policy "diagnostic_responses_insert_member"
on public.diagnostic_responses for insert
to authenticated
with check (
  answered_by = (select auth.uid())
  and diagnostic_id in (
    select diagnostic.id
    from public.diagnostics as diagnostic
    where diagnostic.organization_id in (
      select membership.organization_id
      from public.organization_memberships as membership
      where membership.user_id = (select auth.uid())
    )
  )
);

create policy "diagnostic_responses_update_member"
on public.diagnostic_responses for update
to authenticated
using (
  diagnostic_id in (
    select diagnostic.id
    from public.diagnostics as diagnostic
    where diagnostic.organization_id in (
      select membership.organization_id
      from public.organization_memberships as membership
      where membership.user_id = (select auth.uid())
    )
  )
)
with check (
  answered_by = (select auth.uid())
  and diagnostic_id in (
    select diagnostic.id
    from public.diagnostics as diagnostic
    where diagnostic.organization_id in (
      select membership.organization_id
      from public.organization_memberships as membership
      where membership.user_id = (select auth.uid())
    )
  )
);

revoke all on public.diagnostic_questionnaires from anon, authenticated;
revoke all on public.diagnostic_questions from anon, authenticated;
revoke all on public.diagnostics from anon, authenticated;
revoke all on public.diagnostic_responses from anon, authenticated;

grant select on public.diagnostic_questionnaires, public.diagnostic_questions to authenticated;
grant select on public.diagnostics to authenticated;
grant insert (organization_id, questionnaire_id, started_by)
  on public.diagnostics to authenticated;
grant update (status, provisional_score, completed_at, updated_at)
  on public.diagnostics to authenticated;
grant select on public.diagnostic_responses to authenticated;
grant insert (diagnostic_id, question_id, value, answered_by)
  on public.diagnostic_responses to authenticated;
grant update (value, answered_by, updated_at)
  on public.diagnostic_responses to authenticated;

insert into public.diagnostic_questionnaires (slug, version, title, description, is_active)
values (
  'nexaro-inicial',
  1,
  'Diagnóstico inicial de madurez digital',
  'Evaluación inicial de Nexaro alineada con las seis áreas públicas del marco europeo de madurez digital para pymes.',
  true
);

insert into public.diagnostic_questions (questionnaire_id, dimension, prompt, position)
select questionnaire.id, question.dimension, question.prompt, question.position
from public.diagnostic_questionnaires as questionnaire
cross join (values
  ('digital_strategy', 'La dirección ha definido objetivos digitales concretos y vinculados a las prioridades del negocio.', 1),
  ('digital_strategy', 'Las inversiones digitales se priorizan con responsables, presupuesto e indicadores de resultado.', 2),
  ('digital_strategy', 'La empresa revisa oportunidades digitales a partir de necesidades reales de clientes y operaciones.', 3),
  ('digital_readiness', 'Los procesos esenciales utilizan herramientas fiables e integradas en el trabajo diario.', 4),
  ('digital_readiness', 'La empresa mantiene accesos seguros, copias de respaldo y actualizaciones de sus sistemas.', 5),
  ('digital_readiness', 'La arquitectura tecnológica permite incorporar nuevas soluciones sin rehacer los procesos desde cero.', 6),
  ('digital_skills', 'La empresa conoce las competencias digitales necesarias para cada función clave.', 7),
  ('digital_skills', 'Las personas reciben formación digital continua y adaptada a sus responsabilidades.', 8),
  ('digital_skills', 'Los equipos participan activamente en la adopción y mejora de las herramientas digitales.', 9),
  ('data_management', 'Los datos esenciales están estructurados, localizables y protegidos mediante permisos adecuados.', 10),
  ('data_management', 'Las decisiones habituales utilizan indicadores fiables y revisiones de calidad de los datos.', 11),
  ('data_management', 'Existen reglas claras de privacidad, conservación y recuperación de la información.', 12),
  ('automation_intelligence', 'La empresa identifica y automatiza tareas repetitivas con un beneficio medible.', 13),
  ('automation_intelligence', 'Los sistemas intercambian información y reducen la introducción manual de datos.', 14),
  ('automation_intelligence', 'La analítica avanzada o la inteligencia artificial se prueba con objetivos y supervisión definidos.', 15),
  ('green_digitalisation', 'Las herramientas digitales ayudan a reducir papel, desplazamientos o consumo de recursos.', 16),
  ('green_digitalisation', 'El consumo energético y el impacto ambiental se consideran al elegir tecnología.', 17),
  ('green_digitalisation', 'La empresa utiliza indicadores para seguir la sostenibilidad de su digitalización.', 18)
) as question(dimension, prompt, position)
where questionnaire.slug = 'nexaro-inicial' and questionnaire.version = 1;
