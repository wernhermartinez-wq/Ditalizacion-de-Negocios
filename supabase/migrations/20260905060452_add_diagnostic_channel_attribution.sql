alter table public.diagnostic_questions
  add column response_type text not null default 'maturity_scale'
  check (response_type in ('maturity_scale', 'channel_attribution'));

alter table public.diagnostic_responses
  add column details jsonb not null default '{}'::jsonb
  check (jsonb_typeof(details) = 'object');

grant insert (details) on public.diagnostic_responses to authenticated;
grant update (details) on public.diagnostic_responses to authenticated;

update public.diagnostic_questions as question
set
  response_type = 'channel_attribution',
  prompt = '¿Qué canales utilizas para conseguir consultas o ventas y cuáles te dan resultado?',
  guidance = 'Selecciona primero los canales que utilizas. Después indica en cuáles puedes comprobar consultas o ventas reales. Marcar más canales no aumenta por sí solo la puntuación.',
  evidence_examples = 'Para alcanzar el nivel más alto debes comprobar resultados en todos los canales seleccionados y medir conversión o coste para mejorarlos.'
from public.diagnostic_questionnaires as questionnaire
where question.questionnaire_id = questionnaire.id
  and questionnaire.slug = 'nexaro-inicial'
  and questionnaire.version = 3
  and question.position = 8;
