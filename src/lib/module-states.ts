export const moduleStates = {
  perfil: {
    title: "Mi empresa",
    description: "Datos, contexto y objetivos de la empresa activa.",
    status: "ready" as const,
    action: "Revisar perfil",
  },
  diagnostico: {
    title: "Diagnóstico",
    description: "Mide la madurez digital en seis dimensiones.",
    status: "empty" as const,
    action: "Comenzar diagnóstico",
  },
  evolucion: {
    title: "Evolución",
    description: "Compara resultados validados a lo largo del tiempo.",
    status: "locked" as const,
    action: "Ver diagnóstico actual",
  },
  herramientas: {
    title: "Herramientas",
    description: "Inventario de aplicaciones y conexiones de la empresa.",
    status: "empty" as const,
    action: "Crear inventario",
  },
  "hoja-de-ruta": {
    title: "Hoja de ruta",
    description: "Acciones priorizadas para avanzar con foco.",
    status: "ready" as const,
    action: "Consultar próximos pasos",
  },
  tareas: {
    title: "Tareas",
    description: "Pendientes del equipo cliente y de Nexaro.",
    status: "empty" as const,
    action: "Ver próximas tareas",
  },
  cursos: {
    title: "Cursos",
    description: "Formación recomendada según las brechas detectadas.",
    status: "locked" as const,
    action: "Explorar formación",
  },
  "trabajo-nexaro": {
    title: "Trabajo de Nexaro",
    description: "Proyectos, actividad, entregables y próximos hitos.",
    status: "empty" as const,
    action: "Ver actividad",
  },
};
