update public.diagnostic_questions as question
set
  prompt = case question.position
    when 7 then 'La empresa ejecuta campañas digitales con público, oferta y objetivo comercial definidos.'
    when 8 then 'Las campañas digitales se optimizan según oportunidades y ventas generadas.'
  end,
  guidance = case question.position
    when 7 then 'Incluye campañas orgánicas o de pago con principio y fin, no publicaciones aisladas. Debe quedar claro a quién se dirigen, qué proponen y qué acción esperan.'
    when 8 then 'Responde solo si existen campañas activas. Compara resultados comerciales por canal y contenido; cuando hay inversión, incluye coste por oportunidad o adquisición.'
  end,
  evidence_examples = case question.position
    when 7 then 'Ejemplos: campaña local, serie de contenidos, captación por buscadores o redes, oferta de entrada, audiencia y llamada a la acción.'
    when 8 then 'Ejemplos: oportunidades, ventas atribuidas, conversión, coste por lead, coste de adquisición, ROAS y pruebas de mensaje o audiencia.'
  end
from public.diagnostic_questionnaires as questionnaire
where question.questionnaire_id = questionnaire.id
  and questionnaire.slug = 'nexaro-inicial'
  and questionnaire.version = 3
  and question.position in (7, 8);
