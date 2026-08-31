alter table public.diagnostic_questions
  add column guidance text check (guidance is null or char_length(guidance) between 10 and 700),
  add column evidence_examples text check (evidence_examples is null or char_length(evidence_examples) between 5 and 500);

alter table public.diagnostic_responses
  drop constraint diagnostic_responses_value_check,
  add constraint diagnostic_responses_value_check check (value between 0 and 5);

update public.diagnostic_questionnaires
set is_active = false
where is_active;

insert into public.diagnostic_questionnaires (slug, version, title, description, is_active)
values (
  'nexaro-inicial',
  2,
  'Diagnóstico inicial de madurez digital',
  'Evaluación de 24 prácticas observables durante los últimos 12 meses, alineada con las seis dimensiones del marco europeo DMAT para pymes.',
  true
);

insert into public.diagnostic_questions (
  questionnaire_id,
  dimension,
  prompt,
  guidance,
  evidence_examples,
  position
)
select questionnaire.id, question.dimension, question.prompt, question.guidance, question.evidence_examples, question.position
from public.diagnostic_questionnaires as questionnaire
cross join (values
  (
    'digital_strategy',
    'La dirección aprobó por escrito prioridades de digitalización para los próximos 12 meses.',
    'Valora el nivel según existan objetivos concretos, una persona responsable, fechas y recursos asignados. Una intención verbal no cuenta como plan aprobado.',
    'Ejemplos: plan anual, hoja de ruta, acta de dirección, responsable y presupuesto identificados.',
    1
  ),
  (
    'digital_strategy',
    'Las inversiones digitales se seleccionan por su impacto esperado en un objetivo del negocio.',
    'Comprueba si cada inversión relevante se vincula antes de aprobarse con un resultado medible: tiempo, coste, ventas, calidad, riesgo o satisfacción del cliente.',
    'Ejemplos: caso de negocio, estimación de retorno, reducción prevista de horas o errores.',
    2
  ),
  (
    'digital_strategy',
    'La empresa revisa periódicamente los resultados de sus iniciativas digitales y decide si continuarlas, corregirlas o detenerlas.',
    'Usa la situación de los últimos 12 meses. Para niveles altos debe existir una revisión al menos trimestral con indicadores y decisiones registradas.',
    'Ejemplos: cuadro de seguimiento, reunión trimestral, decisión documentada sobre un proyecto.',
    3
  ),
  (
    'digital_strategy',
    'Las necesidades digitales de clientes, personal y operaciones se recogen antes de definir nuevas soluciones.',
    'Valora si la empresa identifica primero el problema y las personas afectadas, en lugar de comprar una herramienta por tendencia o recomendación comercial.',
    'Ejemplos: entrevistas, incidencias, mapa del proceso, datos de uso, prueba con usuarios.',
    4
  ),
  (
    'digital_readiness',
    'Los procesos esenciales se gestionan en sistemas digitales adecuados y no dependen de información dispersa.',
    'Piensa en ventas, atención, operaciones, compras, facturación y personal. Valora qué proporción funciona con información localizable, actualizada y compartida.',
    'Ejemplos: CRM, ERP, gestor de proyectos, facturación, inventario o aplicaciones sectoriales.',
    5
  ),
  (
    'digital_readiness',
    'Los sistemas clave intercambian datos sin volver a introducir manualmente la misma información.',
    'Valora el alcance real de las integraciones en producción. Copiar datos entre correos, hojas de cálculo y aplicaciones se considera trabajo manual.',
    'Ejemplos: CRM conectado con facturación, formularios que crean registros, API o automatización entre aplicaciones.',
    6
  ),
  (
    'digital_readiness',
    'La empresa mantiene una copia externa de los datos críticos y ha probado su restauración durante los últimos 12 meses.',
    'No basta con que un proveedor indique que hace copias. Para un nivel consolidado debe conocerse qué se copia, con qué frecuencia y haberse realizado una prueba de recuperación.',
    'Ejemplos: informe de backup, registro de prueba de restauración, copia cifrada fuera del equipo principal.',
    7
  ),
  (
    'digital_readiness',
    'Los accesos y dispositivos se protegen mediante controles aplicados de forma consistente.',
    'Valora cuentas individuales, doble factor, retirada de accesos al salir una persona, actualizaciones y protección de equipos. Responde por la práctica habitual, no por casos aislados.',
    'Ejemplos: MFA, gestor de contraseñas, inventario de equipos, proceso de alta y baja, actualizaciones automáticas.',
    8
  ),
  (
    'digital_skills',
    'Durante los últimos 12 meses se evaluaron las competencias digitales necesarias y las carencias del personal.',
    'Debe compararse lo que cada función necesita con lo que las personas pueden hacer actualmente. Una encuesta general de satisfacción no equivale a evaluar competencias.',
    'Ejemplos: matriz por puesto, autoevaluación validada, entrevistas, resultados de pruebas prácticas.',
    9
  ),
  (
    'digital_skills',
    'La formación digital responde a carencias identificadas y se comprueba si mejora el trabajo.',
    'Valora si existe un plan, participación registrada y una comprobación posterior de uso o desempeño; no solo cursos disponibles sin seguimiento.',
    'Ejemplos: plan formativo, asistencia, ejercicios, reducción de incidencias, adopción de funciones aprendidas.',
    10
  ),
  (
    'digital_skills',
    'Las personas afectadas participan en la selección, prueba y ajuste de nuevas herramientas digitales.',
    'Para niveles altos, usuarios no técnicos prueban casos reales antes del despliegue y sus observaciones producen cambios en la solución o el proceso.',
    'Ejemplos: piloto, grupo de usuarios, registro de comentarios, criterios de aceptación.',
    11
  ),
  (
    'digital_skills',
    'Después de implantar una herramienta se mide su adopción y existe un canal claro de soporte.',
    'Valora si en los 30 a 90 días posteriores se revisan uso, dudas, errores y abandonos, y si se toman medidas de refuerzo.',
    'Ejemplos: estadísticas de uso, mesa de ayuda, sesiones de refuerzo, responsable interno o proveedor con SLA.',
    12
  ),
  (
    'data_management',
    'Cada dato crítico tiene una fuente reconocida, una definición común y una persona responsable de su calidad.',
    'Piensa en clientes, ventas, costes, proyectos, inventario o producción. Si existen cifras distintas para el mismo indicador, la práctica no está consolidada.',
    'Ejemplos: catálogo de datos, diccionario de indicadores, propietario del dato, sistema maestro identificado.',
    13
  ),
  (
    'data_management',
    'Las decisiones periódicas utilizan indicadores actualizados obtenidos de datos reales de la empresa.',
    'Valora la frecuencia y cobertura. Para niveles altos, los responsables consultan al menos mensualmente indicadores trazables sin reconstruirlos manualmente cada vez.',
    'Ejemplos: panel de ventas, margen por proyecto, entregas a tiempo, incidencias o rotación.',
    14
  ),
  (
    'data_management',
    'La empresa detecta y corrige errores de datos mediante controles definidos.',
    'Considera duplicados, campos incompletos, formatos inconsistentes y cifras imposibles. La corrección ocasional cuando alguien se queja corresponde a un nivel inicial.',
    'Ejemplos: reglas de validación, revisión mensual, informe de calidad, responsable y plazo de corrección.',
    15
  ),
  (
    'data_management',
    'Los permisos sobre datos sensibles se revisan y existe una regla documentada de conservación y eliminación.',
    'Valora si cada persona accede solo a lo necesario, si los accesos se revisaron en los últimos 12 meses y si se conoce cuándo archivar o eliminar información.',
    'Ejemplos: matriz de permisos, revisión semestral, política de conservación, registro de bajas de acceso.',
    16
  ),
  (
    'automation_intelligence',
    'La empresa identifica tareas repetitivas y cuantifica su volumen, tiempo y errores antes de automatizarlas.',
    'No valores solo ideas. Debe existir al menos un análisis de frecuencia, horas consumidas, errores o demora que permita priorizar oportunidades.',
    'Ejemplos: inventario de tareas, medición de tiempos, volumen mensual, coste estimado del trabajo manual.',
    17
  ),
  (
    'automation_intelligence',
    'Existen automatizaciones en producción que ejecutan pasos completos sin intervención manual rutinaria.',
    'Valora cuántos procesos relevantes funcionan de extremo a extremo y están supervisados. Una plantilla o una macro usada ocasionalmente corresponde a un nivel bajo.',
    'Ejemplos: alta automática de solicitudes, avisos por reglas, conciliación, generación de documentos o sincronización entre sistemas.',
    18
  ),
  (
    'automation_intelligence',
    'Los usos de inteligencia artificial tienen un objetivo definido, datos autorizados y revisión humana proporcional al riesgo.',
    'Incluye IA generativa, predicción, visión, voz o recomendación. Para niveles altos deben existir responsables, criterios de calidad y límites sobre información confidencial.',
    'Ejemplos: asistente documental con revisión, previsión de demanda, clasificación de incidencias, política de uso de IA.',
    19
  ),
  (
    'automation_intelligence',
    'La empresa mide el resultado de las automatizaciones o soluciones de IA que utiliza.',
    'Responde por soluciones en uso real. Deben compararse resultados con la situación anterior y vigilarse fallos, ahorro, calidad o aceptación.',
    'Ejemplos: horas ahorradas, tasa de error, precisión, tiempo de respuesta, incidencias y revisión periódica.',
    20
  ),
  (
    'green_digitalisation',
    'Durante los últimos 12 meses una solución digital redujo de forma medible papel, desplazamientos, energía, materiales o residuos.',
    'Debe poder identificarse el proceso, el recurso reducido y una comparación antes/después. Digitalizar documentos sin medir el efecto corresponde a un nivel inicial.',
    'Ejemplos: firmas digitales, rutas optimizadas, teleasistencia, control de consumos, reducción de impresiones.',
    21
  ),
  (
    'green_digitalisation',
    'La compra de tecnología considera consumo energético, vida útil, reparación, reutilización y reciclaje.',
    'Valora si estos criterios aparecen de forma explícita al comparar equipos, software, nube o proveedores, además de precio y funcionalidad.',
    'Ejemplos: criterios de compra, etiquetas energéticas, reparabilidad, compromiso de retirada o métricas del proveedor cloud.',
    22
  ),
  (
    'green_digitalisation',
    'La empresa usa datos digitales para controlar consumos o impactos ambientales y actuar cuando se desvían.',
    'Puede referirse a energía, combustible, agua, materias primas, transporte, emisiones o residuos. Para niveles altos existen objetivos y revisiones periódicas.',
    'Ejemplos: contadores conectados, panel de consumo, alertas, indicadores por unidad producida o servicio prestado.',
    23
  ),
  (
    'green_digitalisation',
    'Los equipos tecnológicos tienen un proceso trazable de reutilización, borrado seguro y reciclaje al final de su vida útil.',
    'Valora si existe inventario, responsable y evidencia del destino de ordenadores, móviles, baterías y otros equipos retirados.',
    'Ejemplos: inventario de activos, certificado de borrado, reasignación interna, gestor autorizado de residuos electrónicos.',
    24
  )
) as question(dimension, prompt, guidance, evidence_examples, position)
where questionnaire.slug = 'nexaro-inicial' and questionnaire.version = 2;
