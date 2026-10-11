import type { Tables } from "@/lib/supabase/database.types";

export type RestaurantRoadmapStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type RestaurantRoadmapOwner = "Nexaro" | "Restaurante";

export type RestaurantRoadmapTemplate = {
  key: string;
  stage: number;
  stageTitle: string;
  period: string;
  title: string;
  description: string;
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
    key: "local_baseline", stage: 1, stageTitle: "Preparar el local", period: "Días 1–7",
    title: "Revisar la situación real del restaurante",
    description: "Comprobamos horarios, contacto, carta, reservas y cómo encuentra hoy el cliente la información básica.",
    nexaroAction: "Nexaro documenta el punto de partida y detecta errores que frenan visitas o reservas.",
    evidence: "Ficha inicial revisada y datos clave documentados.", owner: "Nexaro", priority: "high",
  },
  {
    key: "accesses", stage: 1, stageTitle: "Preparar el local", period: "Días 1–7",
    title: "Reunir los accesos imprescindibles",
    description: "Centralizamos los accesos a Google, web, dominio, redes, reservas y carta digital.",
    nexaroAction: "Nexaro verifica qué accesos existen, quién es propietario y cuáles faltan.",
    evidence: "Inventario de accesos validado.", owner: "Restaurante", priority: "high",
  },
  {
    key: "google_profile", stage: 2, stageTitle: "Conseguir que te encuentren", period: "Días 8–30",
    title: "Optimizar Google y la presencia local",
    description: "Corregimos categoría, horarios, servicios, fotografías, enlaces y datos de contacto.",
    nexaroAction: "Nexaro actualiza y comprueba la ficha para búsquedas locales relevantes.",
    evidence: "Ficha publicada y comprobada desde móvil.", owner: "Nexaro", priority: "high",
  },
  {
    key: "menu_web", stage: 2, stageTitle: "Conseguir que te encuentren", period: "Días 8–30",
    title: "Publicar una carta clara y accesible",
    description: "La carta debe abrir rápido, leerse bien en móvil y mostrar precios, alérgenos y propuesta del local.",
    nexaroAction: "Nexaro prepara o mejora la carta digital y sus enlaces públicos.",
    evidence: "Carta móvil publicada y enlazada.", owner: "Nexaro", priority: "high",
  },
  {
    key: "reputation", stage: 3, stageTitle: "Generar confianza", period: "Días 15–40",
    title: "Ordenar la reputación y las reseñas",
    description: "Facilitamos una solicitud voluntaria de reseña y una forma sencilla de responder a los clientes.",
    nexaroAction: "Nexaro configura el recorrido y prepara respuestas y seguimiento.",
    evidence: "Enlace de reseña probado y protocolo activo.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "nfc_table", stage: 3, stageTitle: "Generar confianza", period: "Días 15–40",
    title: "Activar NFC Mesa · Descubre",
    description: "Una etiqueta NFC en la mesa abre una experiencia móvil con carta, reserva, WhatsApp, alta Wallet y reseña opcional.",
    nexaroAction: "Nexaro configura el destino, programa las etiquetas y comprueba el recorrido en el local.",
    evidence: "NFC instalado y recorrido probado en mesa.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "mobile_conversion", stage: 4, stageTitle: "Convertir en reservas", period: "Días 31–60",
    title: "Simplificar reservas y contacto",
    description: "Reducimos pasos para llamar, reservar o escribir y medimos desde qué canal llega cada contacto.",
    nexaroAction: "Nexaro conecta llamadas a la acción y verifica cada recorrido desde móvil.",
    evidence: "Reserva o contacto completado de principio a fin.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "wallet_program", stage: 5, stageTitle: "Conseguir que vuelvan", period: "Días 61–90",
    title: "Lanzar la tarjeta de fidelización Wallet",
    description: "El cliente guarda una tarjeta en Apple Wallet o Google Wallet sin instalar una aplicación.",
    nexaroAction: "Nexaro define alta, puntos, saldo, recompensas y comunicación de la tarjeta.",
    evidence: "Tarjeta Wallet emitida y ciclo de prueba completado.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "nfc_checkout", stage: 5, stageTitle: "Conseguir que vuelvan", period: "Días 61–90",
    title: "Activar NFC Caja · Acumula",
    description: "Al pagar, un lector identifica la tarjeta Wallet para sumar puntos o saldo vinculados a la compra.",
    nexaroAction: "Nexaro integra un lector y proveedor compatible, registra la operación y deja trazabilidad.",
    evidence: "Compra de prueba acreditada correctamente en Wallet.", owner: "Nexaro", priority: "medium",
  },
  {
    key: "monthly_review", stage: 6, stageTitle: "Mejorar cada mes", period: "Recurrente",
    title: "Revisar resultados y decidir el siguiente paso",
    description: "Comparamos visibilidad, contactos, reservas, reseñas y recurrencia para priorizar una mejora concreta.",
    nexaroAction: "Nexaro entrega una revisión breve, comprueba lo realizado y actualiza el plan.",
    evidence: "Informe mensual y próximo paso acordado.", owner: "Nexaro", priority: "low",
  },
];

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

export function getCurrentRestaurantStep(steps: RestaurantRoadmapStep[]) {
  return steps.find((step) => step.status === "in_progress")
    ?? steps.find((step) => step.status === "pending")
    ?? null;
}

export const restaurantStatusLabels: Record<RestaurantRoadmapStatus, string> = {
  pending: "Por preparar",
  in_progress: "En curso",
  completed: "Comprobado",
  cancelled: "No incluido",
};
