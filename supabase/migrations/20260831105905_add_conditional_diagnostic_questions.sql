alter table public.diagnostic_questions
  add column dependency_mode text not null default 'all'
  check (dependency_mode in ('all', 'any'));

create table public.diagnostic_question_dependencies (
  child_question_id uuid not null references public.diagnostic_questions(id) on delete cascade,
  parent_question_id uuid not null references public.diagnostic_questions(id) on delete cascade,
  min_value smallint not null default 1 check (min_value between 0 and 5),
  max_value smallint not null default 5 check (max_value between 0 and 5),
  primary key (child_question_id, parent_question_id),
  check (child_question_id <> parent_question_id),
  check (min_value <= max_value)
);

create index diagnostic_question_dependencies_parent_idx
  on public.diagnostic_question_dependencies (parent_question_id);

alter table public.diagnostic_question_dependencies enable row level security;

create policy "diagnostic_question_dependencies_select_authenticated"
on public.diagnostic_question_dependencies for select
to authenticated
using (true);

revoke all on public.diagnostic_question_dependencies from anon, authenticated;
grant select on public.diagnostic_question_dependencies to authenticated;

update public.diagnostic_questions as question
set dependency_mode = 'all'
from public.diagnostic_questionnaires as questionnaire
where question.questionnaire_id = questionnaire.id
  and questionnaire.slug = 'nexaro-inicial'
  and questionnaire.version = 2
  and question.position = 6;

insert into public.diagnostic_question_dependencies (child_question_id, parent_question_id, min_value, max_value)
select child.id, parent.id, 2, 5
from public.diagnostic_questionnaires as questionnaire
join public.diagnostic_questions as child
  on child.questionnaire_id = questionnaire.id and child.position = 6
join public.diagnostic_questions as parent
  on parent.questionnaire_id = questionnaire.id and parent.position = 5
where questionnaire.slug = 'nexaro-inicial' and questionnaire.version = 2;

update public.diagnostic_questions as question
set dependency_mode = 'any'
from public.diagnostic_questionnaires as questionnaire
where question.questionnaire_id = questionnaire.id
  and questionnaire.slug = 'nexaro-inicial'
  and questionnaire.version = 2
  and question.position = 20;

insert into public.diagnostic_question_dependencies (child_question_id, parent_question_id, min_value, max_value)
select child.id, parent.id, 2, 5
from public.diagnostic_questionnaires as questionnaire
join public.diagnostic_questions as child
  on child.questionnaire_id = questionnaire.id and child.position = 20
join public.diagnostic_questions as parent
  on parent.questionnaire_id = questionnaire.id and parent.position in (18, 19)
where questionnaire.slug = 'nexaro-inicial' and questionnaire.version = 2;

update public.diagnostic_responses as response
set value = 0, updated_at = now()
where response.question_id in (
  select child.id
  from public.diagnostic_questionnaires as questionnaire
  join public.diagnostic_questions as child
    on child.questionnaire_id = questionnaire.id and child.position = 20
  where questionnaire.slug = 'nexaro-inicial' and questionnaire.version = 2
)
and not exists (
  select 1
  from public.diagnostic_question_dependencies as dependency
  join public.diagnostic_responses as parent_response
    on parent_response.diagnostic_id = response.diagnostic_id
    and parent_response.question_id = dependency.parent_question_id
  where dependency.child_question_id = response.question_id
    and parent_response.value between dependency.min_value and dependency.max_value
);

update public.diagnostics as diagnostic
set provisional_score = score.value, updated_at = now()
from (
  select response.diagnostic_id,
    round(avg(((response.value - 1) * 25)::numeric) filter (where response.value between 1 and 5), 2) as value
  from public.diagnostic_responses as response
  group by response.diagnostic_id
) as score
where diagnostic.id = score.diagnostic_id
  and diagnostic.status = 'completed'
  and score.value is not null;
