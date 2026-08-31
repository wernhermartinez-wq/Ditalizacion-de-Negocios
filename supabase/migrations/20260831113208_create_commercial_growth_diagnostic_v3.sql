alter table public.diagnostic_questions
  drop constraint diagnostic_questions_dimension_check,
  add constraint diagnostic_questions_dimension_check check (dimension in (
    'digital_strategy', 'digital_readiness', 'digital_skills', 'data_management',
    'automation_intelligence', 'green_digitalisation', 'digital_presence',
    'acquisition', 'sales_funnel', 'customer_experience', 'data_automation',
    'strategy_enablement'
  ));

update public.diagnostic_questionnaires
set is_active = false
where is_active;

insert into public.diagnostic_questionnaires (slug, version, title, description, is_active)
values (
  'nexaro-inicial',
  3,
  'Diagnóstico de crecimiento y digitalización',
  'Evaluación de 24 prácticas observables sobre presencia digital, captación, ventas, clientes y capacidades internas que sostienen el crecimiento.',
  true
);

insert into public.diagnostic_questions (
  questionnaire_id, dimension, prompt, guidance, evidence_examples, position
)
select questionnaire.id, question.dimension, question.prompt, question.guidance, question.evidence_examples, question.position
from public.diagnostic_questionnaires as questionnaire
cross join (values
  ('digital_presence',
   'La propuesta de valor se entiende en menos de un minuto en el principal canal digital de la empresa.',
   'Comprueba si una persona que no conoce el negocio puede identificar qué ofrece, para quién, en qué zona trabaja y por qué debería elegirlo.',
   'Ejemplos: titular específico, servicios principales, clientes objetivo, zona, diferenciador y prueba de confianza visibles.', 1),
  ('digital_presence',
   'La empresa controla y mantiene actualizados sus activos digitales esenciales.',
   'Valora si existe acceso corporativo, responsable y revisión periódica de web, dominio, perfiles sociales, ficha de Google, directorios y marketplaces relevantes.',
   'Ejemplos: propietarios y accesos documentados, horarios correctos, servicios, fotografías, teléfonos y enlaces revisados.', 2),
  ('digital_presence',
   'Los clientes potenciales encuentran la empresa cuando buscan sus servicios en internet.',
   'Responde con evidencia de búsquedas reales por servicio, problema y ubicación; no solo buscando el nombre exacto de la empresa.',
   'Ejemplos: Google Business Profile, Search Console, posiciones locales, visitas orgánicas, impresiones o consultas desde mapas.', 3),
  ('digital_presence',
   'El principal canal digital facilita una acción comercial clara desde móvil.',
   'Comprueba que una persona pueda llamar, escribir, reservar, comprar o solicitar presupuesto sin buscar información ni completar pasos innecesarios.',
   'Ejemplos: llamada a la acción visible, formulario breve, WhatsApp, reserva, compra, velocidad y prueba en móvil.', 4),

  ('acquisition',
   'La empresa recibe oportunidades comerciales identificables desde canales digitales.',
   'Valora la regularidad y el volumen de contactos útiles, no seguidores o visitas sin intención comercial.',
   'Ejemplos: formularios, llamadas desde Google, mensajes, reservas, solicitudes de presupuesto, leads de campañas o marketplaces.', 5),
  ('acquisition',
   'Cada oportunidad digital conserva el canal, campaña o contenido que la originó.',
   'Responde solo por oportunidades reales. Para niveles altos, la fuente acompaña al contacto hasta la venta y permite comparar calidad entre canales.',
   'Ejemplos: UTM, campo de origen en CRM, número de llamada, evento de conversión o pregunta de procedencia registrada.', 6),
  ('acquisition',
   'El contenido y las acciones de captación responden a públicos, problemas y objetivos definidos.',
   'Valora si existe una planificación basada en las preguntas del cliente y en una etapa concreta del recorrido, no publicaciones improvisadas.',
   'Ejemplos: calendario, temas por perfil, casos reales, comparativas, demostraciones, guías, campañas locales o alianzas.', 7),
  ('acquisition',
   'Las campañas de pago se optimizan con coste por oportunidad y resultado comercial.',
   'Responde solo si existe inversión activa. No basta con clics o alcance: debe conocerse cuánto cuesta generar una oportunidad y cuántas terminan en venta.',
   'Ejemplos: coste por lead, coste de adquisición, ventas atribuidas, ROAS, palabras o audiencias excluidas y pruebas A/B.', 8),

  ('sales_funnel',
   'El recorrido desde el primer contacto hasta la venta está dividido en etapas con criterios claros.',
   'Comprueba si el equipo distingue y define estados como contacto nuevo, cualificado, propuesta, negociación, ganado y perdido.',
   'Ejemplos: embudo documentado, condiciones para cambiar de etapa, responsable y siguiente acción obligatoria.', 9),
  ('sales_funnel',
   'Todas las oportunidades se registran en un sistema compartido y tienen responsable y próxima acción.',
   'Valora la cobertura real. Los contactos que permanecen únicamente en correos, teléfonos o memoria del vendedor no están controlados.',
   'Ejemplos: CRM o tablero comercial con origen, valor, etapa, responsable, fecha y siguiente seguimiento.', 10),
  ('sales_funnel',
   'Los nuevos contactos reciben una primera respuesta y seguimiento dentro de plazos definidos.',
   'Comprueba tiempos reales, número de intentos y reglas para evitar que una oportunidad se pierda por falta de respuesta.',
   'Ejemplos: respuesta automática útil, aviso al responsable, SLA, secuencia de seguimiento y alertas por inactividad.', 11),
  ('sales_funnel',
   'La empresa mide conversión, duración y motivos de pérdida en cada etapa comercial.',
   'Para niveles altos se revisan los datos con frecuencia y se cambia el proceso, el mensaje o la oferta según los cuellos de botella encontrados.',
   'Ejemplos: contacto a reunión, reunión a propuesta, propuesta a venta, días por etapa y motivos de pérdida normalizados.', 12),

  ('customer_experience',
   'Las consultas de clientes se centralizan y se atienden con tiempos y responsables visibles.',
   'Incluye correo, teléfono, WhatsApp, redes y formularios. Valora si se evita duplicar, olvidar o responder de forma contradictoria.',
   'Ejemplos: bandeja compartida, CRM, tickets, responsable, prioridad, plantilla contextual y tiempo de primera respuesta.', 13),
  ('customer_experience',
   'La compra, reserva, contratación o incorporación del cliente tiene pasos digitales simples y explicados.',
   'Evalúa el recorrido real desde la decisión hasta comenzar a recibir el servicio, incluyendo documentos, pagos, citas e información inicial.',
   'Ejemplos: presupuesto aceptable online, firma, pago, agenda, formulario previo, confirmaciones y guía de bienvenida.', 14),
  ('customer_experience',
   'La empresa recoge opiniones y señales de satisfacción y actúa sobre problemas repetidos.',
   'No basta con leer comentarios ocasionales. Debe existir una solicitud sistemática, clasificación y respuesta ante patrones negativos.',
   'Ejemplos: reseñas verificadas, encuesta posterior, NPS o CSAT, llamadas de calidad, incidencias y plan de mejora.', 15),
  ('customer_experience',
   'Existe un proceso para fidelizar, reactivar o generar recomendaciones después de la primera venta.',
   'Adapta la respuesta al modelo: recompra, renovación, mantenimiento, venta complementaria, referidos o relación de largo plazo.',
   'Ejemplos: recordatorios, seguimiento posventa, campañas por segmento, renovaciones, programa de referidos o clientes inactivos.', 16),

  ('data_automation',
   'Dirección revisa un panel que conecta visibilidad, oportunidades, conversión, ventas y fidelización.',
   'Valora si los indicadores cubren el recorrido completo y se consultan con una frecuencia definida, sin reconstruirlos manualmente cada vez.',
   'Ejemplos: tráfico cualificado, leads, coste por lead, conversión, ticket, margen, recurrencia y origen de ventas.', 17),
  ('data_automation',
   'Los sistemas comerciales intercambian información sin copiar manualmente los mismos datos.',
   'Piensa en web, formularios, agenda, CRM, correo, presupuestos, facturación y soporte. Valora integraciones que funcionan en producción.',
   'Ejemplos: formulario a CRM, reserva a calendario, venta a facturación, actualización de estado y sincronización de contactos.', 18),
  ('data_automation',
   'Existen automatizaciones que eliminan tareas repetitivas del recorrido comercial o del servicio.',
   'Valora procesos completos y supervisados, no una plantilla aislada. Debe mantenerse una revisión humana cuando exista impacto relevante.',
   'Ejemplos: asignación de leads, recordatorios, seguimiento, generación de documentos, clasificación, avisos o solicitud de reseña.', 19),
  ('data_automation',
   'La empresa compara el resultado de sus automatizaciones con la situación anterior.',
   'Responde solo por automatizaciones en uso. Deben medirse ahorro, velocidad, errores, conversión o satisfacción y revisarse los fallos.',
   'Ejemplos: minutos por tarea, leads atendidos a tiempo, errores, conversión, incidencias y tasa de intervención humana.', 20),

  ('strategy_enablement',
   'La empresa tiene objetivos digitales vinculados a ventas o clientes, con responsable, fecha y recursos.',
   'Una intención general de mejorar internet no cuenta. Valora objetivos numéricos y decisiones sobre presupuesto, capacidad y plazo.',
   'Ejemplos: oportunidades mensuales, conversión, ventas digitales, retención, responsable, presupuesto y fecha objetivo.', 21),
  ('strategy_enablement',
   'Marketing, ventas, atención y operaciones revisan juntos el recorrido del cliente.',
   'Valora si comparten datos, detectan traspasos fallidos y acuerdan acciones, aunque en una microempresa varias funciones recaigan en la misma persona.',
   'Ejemplos: revisión mensual del embudo, acuerdos de seguimiento, responsables, incidencias y decisiones registradas.', 22),
  ('strategy_enablement',
   'Las personas responsables dominan las herramientas y prácticas digitales necesarias para su función.',
   'Comprueba si se han identificado carencias concretas y si la formación se aplica a tareas reales con seguimiento posterior.',
   'Ejemplos: matriz por rol, formación en CRM, analítica, contenidos, campañas, automatización o atención multicanal.', 23),
  ('strategy_enablement',
   'Los activos, accesos y datos comerciales están protegidos mediante controles consistentes.',
   'Incluye cuentas individuales, doble factor, permisos, consentimiento, copias y retirada de accesos. Responde por la práctica habitual.',
   'Ejemplos: MFA, gestor de contraseñas, roles, registro de consentimientos, copias probadas y proceso de altas y bajas.', 24)
) as question(dimension, prompt, guidance, evidence_examples, position)
where questionnaire.slug = 'nexaro-inicial' and questionnaire.version = 3;

update public.diagnostic_questions as question
set dependency_mode = dependency.mode
from public.diagnostic_questionnaires as questionnaire
join (values (6, 'all'), (8, 'all'), (12, 'any'), (20, 'all')) as dependency(position, mode) on true
where question.questionnaire_id = questionnaire.id
  and questionnaire.slug = 'nexaro-inicial'
  and questionnaire.version = 3
  and question.position = dependency.position;

insert into public.diagnostic_question_dependencies (child_question_id, parent_question_id, min_value, max_value)
select child.id, parent.id, 2, 5
from public.diagnostic_questionnaires as questionnaire
join public.diagnostic_questions as child on child.questionnaire_id = questionnaire.id
join public.diagnostic_questions as parent on parent.questionnaire_id = questionnaire.id
where questionnaire.slug = 'nexaro-inicial'
  and questionnaire.version = 3
  and (
    (child.position = 6 and parent.position = 5)
    or (child.position = 8 and parent.position = 7)
    or (child.position = 12 and parent.position in (9, 10))
    or (child.position = 20 and parent.position = 19)
  );
