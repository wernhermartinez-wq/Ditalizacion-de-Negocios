import { dimensionScores, type DiagnosticQuestion, type DiagnosticResponse } from "@/lib/diagnostics";

type RoadmapTemplate = {
  title: string;
  objective: string;
  actions: string[];
  success: string;
};

const templates: Record<string, RoadmapTemplate> = {
  digital_presence: {
    title: "Convertir la presencia digital en un punto de entrada comercial",
    objective: "Hacer que la oferta sea encontrable, comprensible y accionable desde móvil.",
    actions: [
      "Reescribir la propuesta principal indicando cliente, problema, servicio, zona y diferenciador.",
      "Actualizar Google Business, perfiles y directorios con información, imágenes y accesos corporativos.",
      "Probar desde móvil una llamada a la acción única y medir llamadas, mensajes, reservas o formularios.",
    ],
    success: "Oferta comprensible, activos actualizados y conversiones del canal principal registradas.",
  },
  acquisition: {
    title: "Construir un sistema de captación medible",
    objective: "Generar oportunidades útiles y saber qué canal, campaña o contenido las produce.",
    actions: [
      "Definir dos perfiles de cliente, sus problemas prioritarios y una oferta de entrada para cada uno.",
      "Planificar cuatro semanas de contenidos o campañas vinculando cada acción a un objetivo comercial.",
      "Registrar el origen de cada oportunidad y comparar volumen, calidad y coste por canal.",
    ],
    success: "Oportunidades digitales con origen identificable y coste o esfuerzo comparable por canal.",
  },
  sales_funnel: {
    title: "Controlar el embudo desde el contacto hasta la venta",
    objective: "Evitar oportunidades olvidadas y localizar los cuellos de botella comerciales.",
    actions: [
      "Definir etapas, criterios de avance y motivos de pérdida del proceso comercial.",
      "Registrar cada oportunidad con origen, responsable, valor, etapa y próxima acción.",
      "Fijar tiempos de primera respuesta y revisar semanalmente conversión y días por etapa.",
    ],
    success: "Embudo completo, sin oportunidades sin responsable y con conversión visible por etapa.",
  },
  customer_experience: {
    title: "Diseñar continuidad después del primer contacto y la primera venta",
    objective: "Reducir fricción, responder con consistencia y aumentar repetición o recomendaciones.",
    actions: [
      "Centralizar consultas y asignar responsable y tiempo objetivo de respuesta.",
      "Simplificar compra, reserva, contratación o bienvenida eliminando pasos y dudas repetidas.",
      "Solicitar opinión tras el servicio y activar un flujo de fidelización, reactivación o referidos.",
    ],
    success: "Tiempos de respuesta visibles, recorrido de alta probado y seguimiento posventa activo.",
  },
  data_automation: {
    title: "Conectar los datos del recorrido comercial",
    objective: "Medir el crecimiento completo y eliminar tareas manuales donde exista evidencia de impacto.",
    actions: [
      "Crear un panel con visibilidad, oportunidades, conversión, ventas y fidelización.",
      "Conectar formularios, agenda, CRM y facturación para evitar reintroducir datos.",
      "Automatizar una tarea repetitiva y comparar tiempo, errores y resultado comercial antes y después.",
    ],
    success: "Panel de extremo a extremo y una automatización con impacto comparado contra una línea base.",
  },
  strategy_enablement: {
    title: "Alinear objetivos, equipo y protección digital",
    objective: "Dar al crecimiento digital responsables, recursos, competencias y controles mínimos.",
    actions: [
      "Aprobar tres objetivos comerciales digitales con cifra, fecha, responsable y presupuesto.",
      "Revisar mensualmente el recorrido del cliente entre marketing, ventas, atención y operaciones.",
      "Cerrar una brecha de competencias y activar MFA, permisos y copias en los activos críticos.",
    ],
    success: "Objetivos con propietario, revisión conjunta y activos críticos protegidos.",
  },
};

export type RoadmapItem = RoadmapTemplate & {
  dimension: string;
  code: string;
  color: string;
  score: number | null;
  phase: number;
  period: string;
  priority: "Alta" | "Media" | "Programada";
  weaknesses: string[];
};

export type RoadmapTask = {
  id: string;
  title: string;
  dimension: string;
  code: string;
  color: string;
  phase: number;
  period: string;
  priority: RoadmapItem["priority"];
};

export function buildRoadmap(questions: DiagnosticQuestion[], responses: DiagnosticResponse[]): RoadmapItem[] {
  const responseByQuestion = new Map(responses.map((response) => [response.question_id, response.value]));
  const scores = dimensionScores(questions, responses);
  const ordered = [...scores].sort((a, b) => (a.score ?? 101) - (b.score ?? 101));

  return ordered.map((dimension, index) => {
    const phase = Math.floor(index / 2) + 1;
    const weaknesses = questions
      .filter((question) => question.dimension === dimension.key && (responseByQuestion.get(question.id) ?? 0) > 0)
      .sort((a, b) => (responseByQuestion.get(a.id) ?? 5) - (responseByQuestion.get(b.id) ?? 5))
      .slice(0, 2)
      .map((question) => question.prompt);
    const template = templates[dimension.key] ?? {
      title: `Revisar ${dimension.name.toLowerCase()}`,
      objective: "Convertir la brecha detectada en una mejora verificable y con responsable.",
      actions: [
        "Confirmar la situación actual con una evidencia concreta.",
        "Definir una mejora, una persona responsable y una fecha objetivo.",
        "Medir el resultado y decidir el siguiente ajuste.",
      ],
      success: "Mejora ejecutada y resultado comparado con la situación inicial.",
    };
    return {
      ...template,
      dimension: dimension.name,
      code: dimension.code,
      color: dimension.color,
      score: dimension.score,
      phase,
      period: phase === 1 ? "0–30 días" : phase === 2 ? "31–60 días" : "61–90 días",
      priority: phase === 1 ? "Alta" : phase === 2 ? "Media" : "Programada",
      weaknesses,
    };
  });
}

export function roadmapTasks(roadmap: RoadmapItem[]): RoadmapTask[] {
  return roadmap.flatMap((item) => item.actions.map((title, index) => ({
    id: `${item.code}-${index + 1}`,
    title,
    dimension: item.dimension,
    code: item.code,
    color: item.color,
    phase: item.phase,
    period: item.period,
    priority: item.priority,
  })));
}
