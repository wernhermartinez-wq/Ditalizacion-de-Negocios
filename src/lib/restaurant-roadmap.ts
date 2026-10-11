import type { Tables } from "@/lib/supabase/database.types";

export type RestaurantRoadmapStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type RestaurantRoadmapOwner = "Nexaro" | "Restaurante";

export type RestaurantRoadmapTemplate = {
  key: string;
  code: string;
  stage: number;
  stageTitle: string;
  period: string;
  title: string;
  description: string;
  restaurantInput: string;
  nexaroAction: string;
  evidence: string;
  owner: RestaurantRoadmapOwner;
  priority: "low" | "medium" | "high" | "critical";
};

export type RestaurantRoadmapStep = RestaurantRoadmapTemplate & {
  status: RestaurantRoadmapStatus;
  note: string | null;
  dueAt: string | null;
  completedAt: string | null;
  stored: boolean;
};

const prefix = "restaurant:";

export const restaurantRoadmapTemplates: RestaurantRoadmapTemplate[] = [
  {
    key: "local_baseline", code: "1A", stage: 1, stageTitle: "Analizar el restaurante", period: "Semana 1",
    title: "Analizar el restaurante y su presencia digital",
    description: "Evaluamos el negocio, su radar digital y su reputación frente a competidores cercanos.",
    restaurantInput: "Confirmar propuesta, zona de influencia y competidores directos.",
    nexaroAction: "Nexaro revisa presencia, reputación, oferta y competencia para detectar brechas y oportunidades.",
    evidence: "Radar inicial y comparación competitiva documentados.", owner: "Nexaro", priority: "high",
  },
  {
    key: "accesses", code: "1B", stage: 1, stageTitle: "Analizar el restaurante", period: "Semana 1",
    title: "Solicitar los accesos de administración",
    description: "Reunimos los accesos a Google, web, dominio, redes, reservas y carta digital.",
    restaurantInput: "Autorizar a Nexaro como administrador o facilitar el acceso seguro a cada activo.",
    nexaroAction: "Nexaro comprueba qué accesos funcionan, quién es propietario y cuáles faltan.",
    evidence: "Inventario de accesos recibido y validado.", owner: "Restaurante", priority: "high",
  },
  {
    key: "initial_google_baseline", code: "1C", stage: 1, stageTitle: "Analizar el restaurante", period: "Semana 1",
    title: "Extraer la primera fotografía de rendimiento",
    description: "Registramos la situación inicial con los datos reales que Google ya tiene disponibles.",
    restaurantInput: "Permitir el acceso a las estadísticas existentes y aclarar cambios recientes del negocio.",
    nexaroAction: "Nexaro recoge búsquedas, visualizaciones, llamadas, rutas, visitas y reservas disponibles.",
    evidence: "Fotografía inicial fechada y guardada como referencia.", owner: "Nexaro", priority: "high",
  },
  {
    key: "business_data", code: "2A", stage: 2, stageTitle: "Preparar la base digital", period: "Semanas 1–2",
    title: "Corregir la información básica",
    description: "Unificamos nombre, dirección, teléfono, horarios, ubicación, servicios y enlaces.",
    restaurantInput: "Confirmar la información oficial y los horarios especiales.",
    nexaroAction: "Nexaro crea una ficha maestra y corrige contradicciones entre los canales actuales.",
    evidence: "Datos principales coherentes y comprobados desde móvil.", owner: "Nexaro", priority: "high",
  },
  {
    key: "menu_web", code: "2B", stage: 2, stageTitle: "Preparar la base digital", period: "Semanas 1–2",
    title: "Ordenar y mejorar la carta digital",
    description: "La carta debe abrir rápido, leerse bien en móvil y mostrar precios, alérgenos y propuesta.",
    restaurantInput: "Entregar la carta vigente y confirmar precios, platos y alérgenos.",
    nexaroAction: "Nexaro corrige la estructura, presentación móvil y enlaces de la carta.",
    evidence: "Carta vigente, accesible y comprobada desde móvil.", owner: "Nexaro", priority: "high",
  },
  {
    key: "content_library", code: "2C", stage: 2, stageTitle: "Preparar la base digital", period: "Semanas 1–2",
    title: "Preparar los contenidos esenciales",
    description: "Ordenamos logotipo, fotografías, descripciones, especialidades y elementos diferenciadores.",
    restaurantInput: "Entregar los archivos disponibles y aprobar los textos principales.",
    nexaroAction: "Nexaro selecciona, adapta y organiza una biblioteca única de contenidos.",
    evidence: "Biblioteca de contenidos organizada y aprobada.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "measurement_setup", code: "2D", stage: 2, stageTitle: "Preparar la base digital", period: "Semanas 1–2",
    title: "Instalar o corregir la medición digital",
    description: "Preparamos la medición de web, llamadas, WhatsApp, carta, indicaciones y reservas actuales.",
    restaurantInput: "Autorizar las herramientas de medición y confirmar cuáles son las acciones importantes.",
    nexaroAction: "Nexaro revisa Analytics, Search Console, etiquetas, eventos y enlaces identificables.",
    evidence: "Acciones de prueba registradas correctamente.", owner: "Nexaro", priority: "high",
  },
  {
    key: "asset_security", code: "2E", stage: 2, stageTitle: "Preparar la base digital", period: "Semanas 1–2",
    title: "Proteger y ordenar los activos digitales",
    description: "Ordenamos propietarios, permisos, recuperación, dominio, hosting y copias de seguridad.",
    restaurantInput: "Confirmar responsables y retirar usuarios que ya no deben tener acceso.",
    nexaroAction: "Nexaro documenta responsables y activa las medidas de recuperación y protección necesarias.",
    evidence: "Activos con propietario, recuperación y responsable identificados.", owner: "Nexaro", priority: "high",
  },
  {
    key: "google_profile", code: "3A", stage: 3, stageTitle: "Conseguir visibilidad y confianza", period: "Semanas 2–4",
    title: "Optimizar el Perfil de Empresa de Google",
    description: "Corregimos categorías, descripción, horarios, servicios, atributos, fotografías y enlaces.",
    restaurantInput: "Aprobar los cambios que afectan a la presentación pública del restaurante.",
    nexaroAction: "Nexaro completa y optimiza la ficha con la información validada en la fase anterior.",
    evidence: "Ficha publicada, completa y comprobada desde móvil.", owner: "Nexaro", priority: "high",
  },
  {
    key: "local_search", code: "3B", stage: 3, stageTitle: "Conseguir visibilidad y confianza", period: "Semanas 2–4",
    title: "Mejorar la presencia en búsquedas locales",
    description: "Corregimos duplicados e incoherencias en mapas, buscadores y directorios relevantes.",
    restaurantInput: "Confirmar perfiles antiguos, cambios de nombre o ubicaciones anteriores.",
    nexaroAction: "Nexaro revisa búsquedas locales y normaliza nombre, dirección y teléfono.",
    evidence: "Búsqueda documentada y perfiles principales sin contradicciones.", owner: "Nexaro", priority: "high",
  },
  {
    key: "visual_presence", code: "3C", stage: 3, stageTitle: "Conseguir visibilidad y confianza", period: "Semanas 2–4",
    title: "Mejorar la presentación visual",
    description: "Publicamos imágenes actuales de fachada, sala, platos, ambiente y equipo.",
    restaurantInput: "Aprobar la selección y facilitar nuevas fotografías cuando falte una categoría.",
    nexaroAction: "Nexaro adapta y publica los contenidos preparados en la fase 2.",
    evidence: "Perfiles principales con imágenes actuales y representativas.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "reputation", code: "3D", stage: 3, stageTitle: "Conseguir visibilidad y confianza", period: "Semanas 2–4",
    title: "Gestionar la reputación digital existente",
    description: "Revisamos puntuación, comentarios, reseñas sin responder y problemas repetidos.",
    restaurantInput: "Aclarar incidencias reales antes de responder comentarios delicados.",
    nexaroAction: "Nexaro responde pendientes y establece criterios para gestionar cada tipo de reseña.",
    evidence: "Reseñas pendientes revisadas y protocolo de respuesta aprobado.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "reservation_audit", code: "4A", stage: 4, stageTitle: "Facilitar reservas y contacto", period: "Semanas 4–6",
    title: "Revisar el recorrido actual de reservas",
    description: "Localizamos pasos innecesarios, enlaces rotos, canales desatendidos y puntos de abandono.",
    restaurantInput: "Explicar cómo se reciben y confirman actualmente las solicitudes.",
    nexaroAction: "Nexaro prueba cada recorrido vigente desde móvil y documenta los obstáculos.",
    evidence: "Mapa inicial de reservas con errores identificados.", owner: "Nexaro", priority: "high",
  },
  {
    key: "reservation_channel", code: "4B", stage: 4, stageTitle: "Facilitar reservas y contacto", period: "Semanas 4–6",
    title: "Definir el canal principal de reserva",
    description: "Elegimos un destino prioritario y asignamos una función clara a los canales alternativos.",
    restaurantInput: "Decidir qué canal puede atender con fiabilidad y quién será responsable.",
    nexaroAction: "Nexaro define el recorrido principal y elimina decisiones confusas para el cliente.",
    evidence: "Canal principal y responsable aprobados.", owner: "Nexaro", priority: "high",
  },
  {
    key: "mobile_conversion", code: "4C", stage: 4, stageTitle: "Facilitar reservas y contacto", period: "Semanas 4–6",
    title: "Simplificar la solicitud de reserva",
    description: "Reducimos la solicitud a nombre, fecha, hora, personas, teléfono y observaciones necesarias.",
    restaurantInput: "Confirmar qué datos necesita realmente para aceptar una reserva.",
    nexaroAction: "Nexaro simplifica el formulario, sistema o mensaje inicial del canal elegido.",
    evidence: "Solicitud completada fácilmente desde móvil.", owner: "Nexaro", priority: "high",
  },
  {
    key: "channel_connections", code: "4D", stage: 4, stageTitle: "Facilitar reservas y contacto", period: "Semanas 4–6",
    title: "Conectar los canales actuales",
    description: "Google, web, redes, carta, teléfono y WhatsApp deben llevar al destino correcto.",
    restaurantInput: "Confirmar los números, perfiles y enlaces que permanecerán activos.",
    nexaroAction: "Nexaro publica botones claros y enlaces identificables en cada canal vigente.",
    evidence: "Todos los accesos conducen al destino correcto.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "reservation_operations", code: "4E", stage: 4, stageTitle: "Facilitar reservas y contacto", period: "Semanas 4–6",
    title: "Organizar la atención de solicitudes",
    description: "Definimos responsable, tiempo de respuesta, confirmación, modificación, cancelación y fuera de horario.",
    restaurantInput: "Asignar responsables y aprobar las reglas operativas.",
    nexaroAction: "Nexaro prepara el procedimiento y los mensajes básicos de atención.",
    evidence: "Procedimiento aprobado y utilizable por el equipo.", owner: "Restaurante", priority: "medium",
  },
  {
    key: "reservation_test", code: "4F", stage: 4, stageTitle: "Facilitar reservas y contacto", period: "Semanas 4–6",
    title: "Comprobar el recorrido completo",
    description: "Verificamos después de los cambios que cada solicitud llega, se confirma y registra su origen.",
    restaurantInput: "Atender las solicitudes de prueba como si fueran reservas reales.",
    nexaroAction: "Nexaro ejecuta una prueba final desde cada canal activo.",
    evidence: "Reserva o contacto completado de principio a fin.", owner: "Nexaro", priority: "high",
  },
  {
    key: "loyalty_program", code: "5A", stage: 5, stageTitle: "Activar Wallet y fidelización", period: "Semanas 6–8",
    title: "Definir el programa de fidelización",
    description: "Establecemos puntos o saldo, recompensas, vencimientos y condiciones de uso.",
    restaurantInput: "Aprobar beneficios sostenibles y las condiciones comerciales.",
    nexaroAction: "Nexaro convierte las decisiones en reglas claras y aplicables.",
    evidence: "Programa y condiciones aprobados.", owner: "Nexaro", priority: "high",
  },
  {
    key: "wallet_program", code: "5B", stage: 5, stageTitle: "Activar Wallet y fidelización", period: "Semanas 6–8",
    title: "Construir la tarjeta Wallet",
    description: "Creamos la tarjeta para Apple Wallet y Google Wallet con la identidad del restaurante.",
    restaurantInput: "Aprobar diseño, textos y datos visibles de la tarjeta.",
    nexaroAction: "Nexaro configura la emisión y actualización de la tarjeta digital.",
    evidence: "Tarjeta emitida y añadida correctamente en ambos sistemas.", owner: "Nexaro", priority: "high",
  },
  {
    key: "wallet_signup", code: "5C", stage: 5, stageTitle: "Activar Wallet y fidelización", period: "Semanas 6–8",
    title: "Crear el alta de clientes",
    description: "Preparamos un formulario breve, consentimiento y registro seguro de cada cliente.",
    restaurantInput: "Aprobar los datos solicitados y el consentimiento presentado.",
    nexaroAction: "Nexaro conecta el alta con la emisión de la tarjeta Wallet.",
    evidence: "Cliente de prueba registrado y tarjeta emitida.", owner: "Nexaro", priority: "high",
  },
  {
    key: "post_visit_review", code: "5D", stage: 5, stageTitle: "Activar Wallet y fidelización", period: "Semanas 6–8",
    title: "Preparar la invitación a dejar una reseña",
    description: "Creamos un acceso voluntario a Google sin vincular la reseña con puntos o recompensas.",
    restaurantInput: "Aprobar el mensaje y el momento de la invitación.",
    nexaroAction: "Nexaro configura y comprueba el acceso directo a la reseña.",
    evidence: "Invitación y enlace de reseña verificados.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "nfc_table", code: "5E", stage: 5, stageTitle: "Activar Wallet y fidelización", period: "Semanas 6–8",
    title: "Activar NFC en la mesa",
    description: "Una etiqueta NFC abre dos acciones claras: añadir Wallet o dejar voluntariamente una reseña.",
    restaurantInput: "Aprobar ubicación, mensaje y soporte colocado en la mesa.",
    nexaroAction: "Nexaro programa, instala y comprueba la etiqueta NFC pasiva.",
    evidence: "NFC leído correctamente desde la mesa con distintos móviles.", owner: "Nexaro", priority: "high",
  },
  {
    key: "loyalty_ledger", code: "5F", stage: 5, stageTitle: "Activar Wallet y fidelización", period: "Semanas 6–8",
    title: "Construir la gestión de puntos y recompensas",
    description: "Registramos movimientos, saldo, recompensas e historial de cada cliente.",
    restaurantInput: "Confirmar qué operaciones puede corregir o autorizar el personal.",
    nexaroAction: "Nexaro configura las reglas y el control operativo del programa.",
    evidence: "Movimientos, saldo y canje registrados correctamente.", owner: "Nexaro", priority: "high",
  },
  {
    key: "wallet_pilot", code: "5G", stage: 5, stageTitle: "Activar Wallet y fidelización", period: "Semanas 6–8",
    title: "Probar el recorrido completo",
    description: "Probamos lectura NFC, alta, Wallet, reseña, puntos y recompensa con un cliente de prueba.",
    restaurantInput: "Participar en la prueba y validar la experiencia desde el local.",
    nexaroAction: "Nexaro ejecuta el recorrido y corrige cualquier interrupción.",
    evidence: "Recorrido de fidelización completado sin errores.", owner: "Nexaro", priority: "high",
  },
  {
    key: "nfc_checkout_solution", code: "6A", stage: 6, stageTitle: "Activar NFC en caja", period: "Semanas 8–12",
    title: "Validar la solución técnica",
    description: "Comprobamos qué lector, dispositivo o terminal es compatible con Wallet y la operación del local.",
    restaurantInput: "Facilitar los datos del TPV, dispositivos y conexión disponibles.",
    nexaroAction: "Nexaro valida hardware, proveedor y compatibilidad antes de instalar.",
    evidence: "Solución técnica documentada y aprobada.", owner: "Nexaro", priority: "critical",
  },
  {
    key: "nfc_checkout_rules", code: "6B", stage: 6, stageTitle: "Activar NFC en caja", period: "Semanas 8–12",
    title: "Definir la operación en caja",
    description: "Precisamos cómo identificar, acreditar, canjear y corregir una operación.",
    restaurantInput: "Aprobar el procedimiento y los permisos del personal.",
    nexaroAction: "Nexaro traduce las reglas de fidelización al flujo real de caja.",
    evidence: "Operación de caja aprobada paso a paso.", owner: "Nexaro", priority: "high",
  },
  {
    key: "nfc_checkout_install", code: "6C", stage: 6, stageTitle: "Activar NFC en caja", period: "Semanas 8–12",
    title: "Instalar y configurar el lector NFC",
    description: "Preparamos el dispositivo y comprobamos que reconoce la tarjeta Wallet.",
    restaurantInput: "Permitir la instalación y reservar un momento de prueba en caja.",
    nexaroAction: "Nexaro instala, configura y verifica el lector compatible.",
    evidence: "Lector operativo y tarjeta identificada correctamente.", owner: "Nexaro", priority: "critical",
  },
  {
    key: "nfc_checkout", code: "6D", stage: 6, stageTitle: "Activar NFC en caja", period: "Semanas 8–12",
    title: "Conectar el lector con la fidelización",
    description: "La compra actualiza puntos, saldo o recompensas y conserva el historial.",
    restaurantInput: "Validar importes y resultados de las operaciones de prueba.",
    nexaroAction: "Nexaro integra la lectura con la gestión construida en la fase 5.",
    evidence: "Compra acreditada y registrada correctamente en Wallet.", owner: "Nexaro", priority: "critical",
  },
  {
    key: "nfc_checkout_staff", code: "6E", stage: 6, stageTitle: "Activar NFC en caja", period: "Semanas 8–12",
    title: "Preparar al personal de caja",
    description: "El equipo aprende a acreditar, canjear, corregir y resolver una lectura fallida.",
    restaurantInput: "Designar al personal que utilizará el sistema.",
    nexaroAction: "Nexaro entrega instrucciones y realiza una práctica guiada.",
    evidence: "Personal designado capaz de completar la operación.", owner: "Restaurante", priority: "high",
  },
  {
    key: "nfc_checkout_test", code: "6F", stage: 6, stageTitle: "Activar NFC en caja", period: "Semanas 8–12",
    title: "Probar una operación completa",
    description: "Realizamos una compra, lectura, acreditación o canje y actualización de Wallet.",
    restaurantInput: "Completar la operación desde caja como en una venta real.",
    nexaroAction: "Nexaro supervisa la prueba final y documenta el resultado.",
    evidence: "Operación completada sin intervención técnica.", owner: "Nexaro", priority: "critical",
  },
  {
    key: "monthly_data", code: "7A", stage: 7, stageTitle: "Medir y mejorar cada mes", period: "Recurrente",
    title: "Recoger y validar los resultados",
    description: "Consolidamos datos de Google, web, contactos, reservas, Wallet y NFC.",
    restaurantInput: "Aportar los datos operativos que no estén disponibles automáticamente.",
    nexaroAction: "Nexaro reúne las fuentes y comprueba que el periodo sea comparable.",
    evidence: "Datos mensuales consolidados y validados.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "monthly_comparison", code: "7B", stage: 7, stageTitle: "Medir y mejorar cada mes", period: "Recurrente",
    title: "Comparar con la fotografía inicial",
    description: "Medimos los cambios frente a la referencia guardada en la fase 1.",
    restaurantInput: "Confirmar hechos del mes que puedan explicar variaciones excepcionales.",
    nexaroAction: "Nexaro calcula diferencias y separa evolución real de incidencias puntuales.",
    evidence: "Comparación mensual documentada.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "monthly_operations", code: "7C", stage: 7, stageTitle: "Medir y mejorar cada mes", period: "Recurrente",
    title: "Revisar incidencias y trabajos realizados",
    description: "Comprobamos errores, pendientes, acciones completadas y resultados obtenidos.",
    restaurantInput: "Comunicar incidencias observadas por clientes o personal.",
    nexaroAction: "Nexaro cruza incidencias con el historial operativo.",
    evidence: "Incidencias y trabajos del periodo revisados.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "monthly_report", code: "7D", stage: 7, stageTitle: "Medir y mejorar cada mes", period: "Recurrente",
    title: "Entregar el informe mensual",
    description: "Mostramos qué cambió, qué hizo Nexaro y qué necesita atención.",
    restaurantInput: "Revisar el informe y aclarar dudas o prioridades del negocio.",
    nexaroAction: "Nexaro resume resultados y conclusiones en lenguaje claro.",
    evidence: "Informe mensual entregado y revisado.", owner: "Nexaro", priority: "low",
  },
  {
    key: "monthly_review", code: "7E", stage: 7, stageTitle: "Medir y mejorar cada mes", period: "Recurrente",
    title: "Elegir la siguiente mejora prioritaria",
    description: "Definimos una acción concreta para el siguiente ciclo y actualizamos el recorrido.",
    restaurantInput: "Validar la prioridad según la situación del negocio.",
    nexaroAction: "Nexaro propone el siguiente paso a partir de los resultados comprobados.",
    evidence: "Siguiente mejora acordada y registrada.", owner: "Nexaro", priority: "low",
  },
];

export const restaurantRoadmapStages = Array.from(
  new Map(restaurantRoadmapTemplates.map((step) => [step.stage, {
    stage: step.stage,
    title: step.stageTitle,
    period: step.period,
  }])).values(),
);

export function restaurantTaskReference(key: string) {
  return `${prefix}${key}`;
}

export function isRestaurantRoadmapTask(task: Pick<Tables<"nexaro_tasks">, "source_reference">) {
  return task.source_reference?.startsWith(prefix) ?? false;
}

export function getRestaurantRoadmapTemplate(key: string) {
  return restaurantRoadmapTemplates.find((template) => template.key === key) ?? null;
}

export function mergeRestaurantRoadmapTasks(tasks: Tables<"nexaro_tasks">[]): RestaurantRoadmapStep[] {
  const byReference = new Map(tasks.filter(isRestaurantRoadmapTask).map((task) => [task.source_reference, task]));
  return restaurantRoadmapTemplates.map((template) => {
    const task = byReference.get(restaurantTaskReference(template.key));
    return {
      ...template,
      status: (task?.status as RestaurantRoadmapStatus | undefined) ?? "pending",
      note: task?.description ?? null,
      dueAt: task?.due_at ?? null,
      completedAt: task?.completed_at ?? null,
      stored: Boolean(task),
    };
  });
}

export function assignedRestaurantRoadmapSteps(tasks: Tables<"nexaro_tasks">[]) {
  return mergeRestaurantRoadmapTasks(tasks).filter((step) => step.stored && step.status !== "cancelled");
}

export function getCurrentRestaurantStep(steps: RestaurantRoadmapStep[]) {
  return steps.find((step) => step.status === "in_progress")
    ?? steps.find((step) => step.status === "pending")
    ?? null;
}

export const restaurantStatusLabels: Record<RestaurantRoadmapStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Comprobado",
  cancelled: "No incluido",
};
