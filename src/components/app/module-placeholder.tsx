import Link from "next/link";
import { CheckCircle2, CircleDashed, Clock3, LockKeyhole, MoveRight } from "lucide-react";
import { moduleStates } from "@/lib/module-states";

type ModuleKey = keyof typeof moduleStates;
const stateInfo = {
  empty: { label: "Aún sin información", detail: "Todavía no hay datos reales registrados en esta sección.", color: "#83979b", icon: CircleDashed },
  "in-progress": { label: "En curso", detail: "Hay trabajo real iniciado para esta empresa.", color: "#168e8d", icon: Clock3 },
  locked: { label: "Aún no disponible", detail: "Completa y valida un diagnóstico para desbloquear esta vista.", color: "#b57a32", icon: LockKeyhole },
  ready: { label: "Datos disponibles", detail: "La información de esta sección pertenece a la empresa activa.", color: "#287b5b", icon: CheckCircle2 },
  complete: { label: "Sin acciones pendientes", detail: "Has completado las recomendaciones disponibles. Aquí aparecerán las nuevas asignaciones.", color: "#287b5b", icon: CheckCircle2 },
};

export function ModulePlaceholder({ moduleKey }: { moduleKey: ModuleKey }) {
  const moduleContent = moduleStates[moduleKey];
  const state = stateInfo[moduleContent.status];
  const Icon = state.icon;
  return (
    <main className="page-content module-stage">
      <section className="state-card">
        <div className="state-visual"><Icon size={24} /></div>
        <p className="eyebrow">Espacio de empresa</p>
        <h1>{moduleContent.title}</h1>
        <p>{moduleContent.description}</p>
        <div className="state-banner" style={{ "--state-color": state.color } as React.CSSProperties}><strong>{state.label}</strong><small>{state.detail}</small></div>
        <Link className="secondary-action" href="/app">Volver al inicio <MoveRight size={16} /></Link>
      </section>
    </main>
  );
}
