create table public.entity_audit_question_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  set_type text not null check (set_type in ('standard', 'custom')),
  version_number integer not null check (version_number > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (set_type = 'standard' and organization_id is null)
    or (set_type = 'custom' and organization_id is not null)
  )
);

create unique index entity_audit_standard_question_set_version_idx
  on public.entity_audit_question_sets (version_number)
  where set_type = 'standard';
create unique index entity_audit_custom_question_set_version_idx
  on public.entity_audit_question_sets (organization_id, version_number)
  where set_type = 'custom';

create table public.entity_audit_questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.entity_audit_question_sets(id) on delete restrict,
  code text not null check (char_length(code) between 2 and 30),
  category text not null check (category in (
    'local_discovery', 'specialty', 'quality_trust', 'reservation_intent', 'comparison', 'custom'
  )),
  position integer not null check (position between 1 and 15),
  prompt_template text not null check (char_length(prompt_template) between 10 and 800),
  country text not null default 'ES' check (char_length(country) = 2),
  language text not null default 'es' check (language in ('es', 'de')),
  created_at timestamptz not null default now(),
  unique (question_set_id, code),
  unique (question_set_id, position)
);

create table public.entity_audit_campaigns (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.entity_audit_cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_version_id uuid not null references public.entity_identity_versions(id) on delete restrict,
  standard_question_set_id uuid not null references public.entity_audit_question_sets(id) on delete restrict,
  custom_question_set_id uuid references public.entity_audit_question_sets(id) on delete restrict,
  visibility_project_id uuid not null references public.visibility_projects(id) on delete restrict,
  visibility_run_id uuid unique references public.visibility_runs(id) on delete restrict,
  campaign_number integer not null check (campaign_number > 0),
  status text not null default 'prepared'
    check (status in ('prepared', 'running', 'completed', 'partial', 'failed')),
  requested_providers text[] not null default array['openai','gemini','perplexity']::text[],
  query_budget integer not null default 45 check (query_budget between 1 and 45),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 180),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (case_id, campaign_number),
  unique (id, organization_id),
  foreign key (identity_version_id, case_id)
    references public.entity_identity_versions(id, case_id) on delete restrict
);

alter table public.entity_audit_cases
  add constraint entity_audit_cases_id_organization_key unique (id, organization_id);
alter table public.entity_audit_campaigns
  add constraint entity_audit_campaign_case_organization_fkey
  foreign key (case_id, organization_id)
  references public.entity_audit_cases(id, organization_id) on delete cascade;

create table public.entity_audit_campaign_questions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.entity_audit_campaigns(id) on delete cascade,
  source_question_id uuid not null references public.entity_audit_questions(id) on delete restrict,
  visibility_prompt_id uuid not null references public.visibility_prompts(id) on delete restrict,
  position integer not null check (position between 1 and 15),
  source_type text not null check (source_type in ('standard', 'custom')),
  category text not null,
  question_text text not null check (char_length(question_text) between 10 and 800),
  created_at timestamptz not null default now(),
  unique (campaign_id, source_question_id),
  unique (campaign_id, visibility_prompt_id),
  unique (campaign_id, position)
);

alter table public.visibility_prompts
  add column entity_audit_question_id uuid references public.entity_audit_questions(id) on delete restrict,
  add column entity_identity_version_id uuid references public.entity_identity_versions(id) on delete restrict;
create unique index visibility_prompts_entity_question_idx
  on public.visibility_prompts (project_id, entity_audit_question_id, entity_identity_version_id)
  where entity_audit_question_id is not null;

alter table public.visibility_runs
  add column entity_audit_campaign_id uuid unique references public.entity_audit_campaigns(id) on delete restrict,
  add column entity_identity_version_id uuid references public.entity_identity_versions(id) on delete restrict;

alter table public.visibility_responses
  add column response_structure text check (response_structure is null or response_structure in ('ordered', 'unordered', 'unknown')),
  add column ordered_position integer check (ordered_position is null or ordered_position > 0),
  add column first_mention boolean,
  add column client_present boolean not null default false;

create index entity_audit_campaigns_org_created_idx
  on public.entity_audit_campaigns (organization_id, created_at desc);
create index entity_audit_campaign_questions_campaign_idx
  on public.entity_audit_campaign_questions (campaign_id, position);

create or replace function private.protect_entity_audit_question_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Las versiones de preguntas Entity Audit son inmutables.';
end;
$$;

create trigger entity_audit_question_sets_immutable
before update or delete on public.entity_audit_question_sets
for each row execute function private.protect_entity_audit_question_history();
create trigger entity_audit_questions_immutable
before update or delete on public.entity_audit_questions
for each row execute function private.protect_entity_audit_question_history();
create trigger entity_audit_campaign_questions_immutable
before update or delete on public.entity_audit_campaign_questions
for each row execute function private.protect_entity_audit_question_history();

create or replace function private.protect_entity_audit_visibility_prompt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.entity_audit_question_id is not null and (
    new.project_id is distinct from old.project_id
    or new.question is distinct from old.question
    or new.country is distinct from old.country
    or new.language is distinct from old.language
    or new.status is distinct from old.status
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
    or new.entity_audit_question_id is distinct from old.entity_audit_question_id
    or new.entity_identity_version_id is distinct from old.entity_identity_version_id
  ) then
    raise exception 'Las preguntas materializadas de una campaña Entity Audit son inmutables.';
  end if;
  return new;
end;
$$;

create trigger visibility_prompts_protect_entity_audit
before update on public.visibility_prompts
for each row execute function private.protect_entity_audit_visibility_prompt();

create or replace function private.enforce_entity_audit_campaign_references()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.entity_audit_cases audit_case
    join public.entity_identity_versions identity
      on identity.id = new.identity_version_id and identity.case_id = audit_case.id
    where audit_case.id = new.case_id
      and audit_case.organization_id = new.organization_id
      and audit_case.status = 'ready'
      and audit_case.current_identity_version_id = identity.id
      and identity.status = 'validated'
  ) then
    raise exception 'La campaña requiere la identidad validada vigente del mismo restaurante.';
  end if;
  if not exists (
    select 1 from public.entity_audit_question_sets
    where id = new.standard_question_set_id and set_type = 'standard' and organization_id is null
  ) then
    raise exception 'El conjunto estándar de la campaña no es válido.';
  end if;
  if new.custom_question_set_id is not null and not exists (
    select 1 from public.entity_audit_question_sets
    where id = new.custom_question_set_id and set_type = 'custom'
      and organization_id = new.organization_id
  ) then
    raise exception 'El conjunto personalizado no pertenece al restaurante.';
  end if;
  if not exists (
    select 1 from public.visibility_projects
    where id = new.visibility_project_id and organization_id = new.organization_id
  ) then
    raise exception 'El proyecto de visibilidad no pertenece al restaurante.';
  end if;
  return new;
end;
$$;

create trigger entity_audit_campaigns_enforce_references
before insert on public.entity_audit_campaigns
for each row execute function private.enforce_entity_audit_campaign_references();

create or replace function private.enforce_entity_audit_campaign_question_references()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.entity_audit_campaigns campaign
    join public.entity_audit_questions question on question.id = new.source_question_id
    join public.visibility_prompts prompt on prompt.id = new.visibility_prompt_id
    where campaign.id = new.campaign_id
      and question.question_set_id in (campaign.standard_question_set_id, campaign.custom_question_set_id)
      and prompt.project_id = campaign.visibility_project_id
      and prompt.entity_audit_question_id = question.id
      and prompt.entity_identity_version_id = campaign.identity_version_id
  ) then
    raise exception 'La pregunta no pertenece a la composición versionada de la campaña.';
  end if;
  return new;
end;
$$;

create trigger entity_audit_campaign_questions_enforce_references
before insert on public.entity_audit_campaign_questions
for each row execute function private.enforce_entity_audit_campaign_question_references();

with standard_set as (
  insert into public.entity_audit_question_sets (set_type, version_number)
  values ('standard', 1)
  returning id
)
insert into public.entity_audit_questions (question_set_id, code, category, position, prompt_template)
select standard_set.id, item.code, item.category, item.position, item.prompt_template
from standard_set
cross join (values
  ('DL-01', 'local_discovery', 1, '¿Qué restaurantes recomiendas en {city}?'),
  ('DL-02', 'local_discovery', 2, '¿Cuáles son los mejores restaurantes de {category} en {city}?'),
  ('ES-01', 'specialty', 3, '¿Dónde comer buena {specialty} en {city}?'),
  ('ES-02', 'specialty', 4, '¿Qué restaurante de {category} destaca en {city}?'),
  ('CC-01', 'quality_trust', 5, '¿Qué restaurantes de {city} destacan por su calidad y buenas opiniones?'),
  ('CC-02', 'quality_trust', 6, '¿Qué restaurante fiable recomiendas en {city} para una ocasión especial?'),
  ('IR-01', 'reservation_intent', 7, '¿Dónde reservar mesa para cenar en {city}?'),
  ('IR-02', 'reservation_intent', 8, '¿Qué restaurante de {category} en {city} permite reservar fácilmente?'),
  ('CO-01', 'comparison', 9, 'Compara los restaurantes de {category} más recomendados de {city}.'),
  ('CO-02', 'comparison', 10, '¿Qué restaurante elegirías en {city} para comer {specialty} y por qué?')
) as item(code, category, position, prompt_template);

create or replace function public.create_entity_audit_custom_question_set(
  p_organization_id uuid,
  p_questions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_set_id uuid;
  v_version integer;
  v_count integer;
begin
  if not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede configurar preguntas de auditoría.';
  end if;
  if not exists (select 1 from public.entity_audit_cases where organization_id = p_organization_id) then
    raise exception 'La organización no tiene un expediente Entity Audit.';
  end if;
  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'Las preguntas deben enviarse como una lista.';
  end if;
  v_count := jsonb_array_length(p_questions);
  if v_count > 5 then
    raise exception 'El piloto permite un máximo de 5 preguntas personalizadas.';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_questions) as question(value)
    where char_length(trim(question.value)) < 10 or char_length(trim(question.value)) > 800
  ) then
    raise exception 'Cada pregunta debe tener entre 10 y 800 caracteres.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('entity-custom-' || p_organization_id::text, 0));
  select coalesce(max(version_number), 0) + 1 into v_version
  from public.entity_audit_question_sets
  where set_type = 'custom' and organization_id = p_organization_id;
  insert into public.entity_audit_question_sets (organization_id, set_type, version_number, created_by)
  values (p_organization_id, 'custom', v_version, (select auth.uid()))
  returning id into v_set_id;
  insert into public.entity_audit_questions (
    question_set_id, code, category, position, prompt_template
  )
  select v_set_id, 'P-' || lpad(ordinality::text, 2, '0'), 'custom', ordinality::integer, trim(value)
  from jsonb_array_elements_text(p_questions) with ordinality;
  return v_set_id;
end;
$$;

create or replace function public.prepare_entity_audit_campaign(
  p_organization_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case public.entity_audit_cases%rowtype;
  v_identity public.entity_identity_versions%rowtype;
  v_standard_set_id uuid;
  v_custom_set_id uuid;
  v_project_id uuid;
  v_campaign_id uuid;
  v_campaign_number integer;
  v_month_count integer;
  v_question record;
  v_prompt_id uuid;
  v_position integer := 0;
  v_rendered text;
  v_city text;
  v_category text;
  v_specialty text;
  v_prompt_ids uuid[] := '{}';
begin
  if not (select private.is_platform_admin()) then
    raise exception 'Sólo Nexaro puede preparar una campaña Entity Audit.';
  end if;
  if char_length(p_idempotency_key) not between 8 and 180 then
    raise exception 'Clave de idempotencia no válida.';
  end if;
  select audit_case.id, audit_case.status, audit_case.current_identity_version_id
  into v_case.id, v_case.status, v_case.current_identity_version_id
  from public.entity_audit_cases as audit_case
  where audit_case.organization_id = p_organization_id for update;
  if v_case.id is null or v_case.status <> 'ready' or v_case.current_identity_version_id is null then
    raise exception 'La identidad comercial debe estar validada antes de medir.';
  end if;
  select identity.id, identity.case_id, identity.commercial_name, identity.name_variants,
         identity.domain, identity.city, identity.region, identity.country_code,
         identity.categories, identity.specialties, identity.services
  into v_identity.id, v_identity.case_id, v_identity.commercial_name, v_identity.name_variants,
       v_identity.domain, v_identity.city, v_identity.region, v_identity.country_code,
       v_identity.categories, v_identity.specialties, v_identity.services
  from public.entity_identity_versions as identity
  where identity.id = v_case.current_identity_version_id
    and identity.case_id = v_case.id and identity.status = 'validated';
  if v_identity.id is null then
    raise exception 'La campaña debe referenciar una identidad validada.';
  end if;
  if coalesce(v_identity.domain, '') = '' then
    raise exception 'La identidad validada necesita un dominio para usar el motor de visibilidad.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('entity-campaign-' || p_organization_id::text, 0));
  select id into v_campaign_id from public.entity_audit_campaigns
  where idempotency_key = p_idempotency_key;
  if v_campaign_id is not null then
    return jsonb_build_object(
      'campaign_id', v_campaign_id,
      'project_id', (select visibility_project_id from public.entity_audit_campaigns where id = v_campaign_id),
      'identity_version_id', (select identity_version_id from public.entity_audit_campaigns where id = v_campaign_id),
      'prompt_ids', (select coalesce(jsonb_agg(visibility_prompt_id order by position), '[]'::jsonb)
                     from public.entity_audit_campaign_questions where campaign_id = v_campaign_id)
    );
  end if;
  select count(*) into v_month_count from public.entity_audit_campaigns
  where case_id = v_case.id
    and status in ('prepared', 'running', 'completed', 'partial')
    and created_at >= date_trunc('month', now())
    and created_at < date_trunc('month', now()) + interval '1 month';
  if v_month_count >= 2 then
    raise exception 'El piloto permite un máximo de 2 campañas completas al mes.';
  end if;

  select id into v_standard_set_id from public.entity_audit_question_sets
  where set_type = 'standard' order by version_number desc limit 1;
  select id into v_custom_set_id from public.entity_audit_question_sets
  where set_type = 'custom' and organization_id = p_organization_id
  order by version_number desc limit 1;

  select project.id into v_project_id
  from public.visibility_projects as project
  where project.organization_id = p_organization_id;
  if v_project_id is null then
    insert into public.visibility_projects (
      organization_id, brand_name, brand_variants, domain, services, business_description,
      country, region, primary_language, status, schedule_frequency, settings, created_by
    ) values (
      p_organization_id, v_identity.commercial_name, v_identity.name_variants, v_identity.domain,
      v_identity.services, array_to_string(v_identity.categories, ', '), v_identity.country_code,
      coalesce(v_identity.city, v_identity.region), 'es', 'active', 'manual',
      '{"max_competitors":10,"max_active_prompts":100,"entity_audit":true}'::jsonb,
      (select auth.uid())
    ) returning id into v_project_id;
  end if;

  select coalesce(max(campaign_number), 0) + 1 into v_campaign_number
  from public.entity_audit_campaigns where case_id = v_case.id;
  insert into public.entity_audit_campaigns (
    case_id, organization_id, identity_version_id, standard_question_set_id,
    custom_question_set_id, visibility_project_id, campaign_number,
    idempotency_key, created_by
  ) values (
    v_case.id, p_organization_id, v_identity.id, v_standard_set_id,
    v_custom_set_id, v_project_id, v_campaign_number, p_idempotency_key, (select auth.uid())
  ) returning id into v_campaign_id;

  v_city := coalesce(nullif(v_identity.city, ''), nullif(v_identity.region, ''), 'su zona');
  v_category := coalesce(v_identity.categories[1], 'restaurantes');
  v_specialty := coalesce(v_identity.specialties[1], v_identity.categories[1], 'comida');
  for v_question in
    select q.*, s.set_type
    from public.entity_audit_questions q
    join public.entity_audit_question_sets s on s.id = q.question_set_id
    where q.question_set_id = v_standard_set_id or q.question_set_id = v_custom_set_id
    order by case when s.set_type = 'standard' then 0 else 1 end, q.position
  loop
    v_position := v_position + 1;
    v_prompt_id := null;
    v_rendered := replace(replace(replace(replace(
      v_question.prompt_template,
      '{city}', v_city), '{category}', v_category), '{specialty}', v_specialty),
      '{name}', v_identity.commercial_name);
    insert into public.visibility_prompts (
      project_id, question, country, language, status, active, created_by,
      approved_by, approved_at, entity_audit_question_id, entity_identity_version_id
    ) values (
      v_project_id, v_rendered, v_question.country, v_question.language, 'approved', true,
      (select auth.uid()), (select auth.uid()), now(), v_question.id, v_identity.id
    )
    on conflict (project_id, entity_audit_question_id, entity_identity_version_id) where entity_audit_question_id is not null
    do nothing
    returning id into v_prompt_id;
    if v_prompt_id is null then
      select prompt.id into v_prompt_id
      from public.visibility_prompts as prompt
      where prompt.project_id = v_project_id
        and prompt.entity_audit_question_id = v_question.id
        and prompt.entity_identity_version_id = v_identity.id;
    end if;
    insert into public.entity_audit_campaign_questions (
      campaign_id, source_question_id, visibility_prompt_id, position,
      source_type, category, question_text
    ) values (
      v_campaign_id, v_question.id, v_prompt_id, v_position,
      v_question.set_type, v_question.category, v_rendered
    );
    v_prompt_ids := array_append(v_prompt_ids, v_prompt_id);
  end loop;
  if v_position < 10 or v_position > 15 or v_position * 3 > 45 then
    raise exception 'La campaña debe contener entre 10 y 15 preguntas y no superar 45 consultas.';
  end if;
  return jsonb_build_object(
    'campaign_id', v_campaign_id,
    'project_id', v_project_id,
    'identity_version_id', v_identity.id,
    'prompt_ids', to_jsonb(v_prompt_ids)
  );
end;
$$;

revoke execute on function public.create_entity_audit_custom_question_set(uuid, jsonb) from public, anon;
grant execute on function public.create_entity_audit_custom_question_set(uuid, jsonb) to authenticated;
revoke execute on function public.prepare_entity_audit_campaign(uuid, text) from public, anon;
grant execute on function public.prepare_entity_audit_campaign(uuid, text) to authenticated;

alter table public.entity_audit_question_sets enable row level security;
alter table public.entity_audit_questions enable row level security;
alter table public.entity_audit_campaigns enable row level security;
alter table public.entity_audit_campaign_questions enable row level security;

revoke all on public.entity_audit_question_sets, public.entity_audit_questions,
  public.entity_audit_campaigns, public.entity_audit_campaign_questions from anon, authenticated;
grant select, insert on public.entity_audit_question_sets, public.entity_audit_questions,
  public.entity_audit_campaigns, public.entity_audit_campaign_questions to authenticated;
grant select, insert, update on public.entity_audit_question_sets, public.entity_audit_questions,
  public.entity_audit_campaigns, public.entity_audit_campaign_questions to service_role;

create policy "Admins read Entity Audit question sets"
on public.entity_audit_question_sets for select to authenticated
using ((select private.is_platform_admin()));
create policy "Admins create Entity Audit question sets"
on public.entity_audit_question_sets for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Admins read Entity Audit questions"
on public.entity_audit_questions for select to authenticated
using ((select private.is_platform_admin()));
create policy "Admins create Entity Audit questions"
on public.entity_audit_questions for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Members read their Entity Audit campaigns"
on public.entity_audit_campaigns for select to authenticated
using (private.is_organization_member(organization_id) or (select private.is_platform_admin()));
create policy "Admins create Entity Audit campaigns"
on public.entity_audit_campaigns for insert to authenticated
with check ((select private.is_platform_admin()));
create policy "Members read their Entity Audit campaign questions"
on public.entity_audit_campaign_questions for select to authenticated
using (exists (
  select 1 from public.entity_audit_campaigns campaign
  where campaign.id = campaign_id
    and (private.is_organization_member(campaign.organization_id) or (select private.is_platform_admin()))
));
create policy "Admins create Entity Audit campaign questions"
on public.entity_audit_campaign_questions for insert to authenticated
with check ((select private.is_platform_admin()));

comment on table public.entity_audit_question_sets is
  'Versiones inmutables de los conjuntos estándar y personalizados de preguntas Entity Audit.';
comment on table public.entity_audit_campaigns is
  'Campañas manuales vinculadas a una identidad validada y a una ejecución del motor de visibilidad existente.';
