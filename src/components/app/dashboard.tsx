import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  ListChecks,
  Wrench,
} from "lucide-react";
import { scoreLabel } from "@/lib/diagnostics";

const emptySections = [
  {
    title: "Trabajo de Nexaro",
    description: "Todavía no hay proyectos ni entregables asociados a esta empresa.",
    icon: FolderKanban,
    href: "/app/trabajo-nexaro",
    link: "Ver espacio de trabajo",
  },
  {
    title: "Herramientas actuales",
    description: "Añade las aplicaciones que utiliza tu empresa para crear el inventario.",
    icon: Wrench,
    href: "/app/herramientas",
    link: "Abrir inventario",
  },
] as const;

type DashboardDiagnostic = {
  status: string;
  score: number | null;
  answered: number;
  total: number;
  dimensions: Array<{ key: string; code: string; name: string; color: string; score: number | null; answered: number }>;
};

type DashboardTask = {
  id: string;
  title: string;
  dimension: string;
  code: string;
  color: string;
  period: string;
};

export function Dashboard({ organizationName, diagnostic, tasks }: { organizationName: string; diagnostic: DashboardDiagnostic | null; tasks: DashboardTask[] }) {
  const completed = diagnostic?.status === "completed" || diagnostic?.status === "validated";
  const validated = diagnostic?.status === "validated";
  const started = Boolean(diagnostic?.answered);
  const nextStepCard = (
    <section className={`card next-step-card ${completed ? "" : "next-step-primary"}`}>
      <div className="next-step-marker"><ClipboardCheck size={24} /></div>
      <div><p className="eyebrow">{completed ? validated ? "Plan validado" : "Plan provisional" : "Primer paso"}</p><h2>{completed ? "Pasa del resultado al plan de 90 días" : started ? "Continúa el diagnóstico de tu negocio" : "Inicia el diagnóstico de tu negocio"}</h2><p>{completed ? validated ? "Nexaro ha revisado y congelado la hoja de ruta de tu empresa." : "Nexaro revisará el diagnóstico antes de confirmar esta hoja de ruta." : "Responde pensando en cómo trabajas hoy. Puedes guardar el borrador y continuar cuando quieras."}</p></div>
      <Link className="secondary-action" href={completed ? "/app/hoja-de-ruta" : "/app/diagnostico"}>{completed ? "Abrir hoja de ruta" : started ? "Continuar" : "Comenzar"} <ArrowRight size={16} /></Link>
    </section>
  );
  return (
    <main className="page-content real-dashboard">
      <div className="page-heading real-dashboard-heading">
        <div>
          <p className="eyebrow">Espacio de empresa · {organizationName}</p>
          <h1>Todo preparado para empezar con datos reales.</h1>
          <p className="page-description">El panel se irá completando con la información que registres y con el trabajo validado por Nexaro.</p>
        </div>
        <span className="real-data-badge"><CheckCircle2 size={16} /> Sin datos simulados</span>
      </div>

      <section className="workspace-confirmation" aria-label="Estado del espacio">
        <span className="workspace-confirmation-icon"><Building2 size={22} /></span>
        <div><strong>{organizationName} ya tiene un espacio privado.</strong><p>Tu empresa y tu cuenta están vinculadas correctamente.</p></div>
        <Link href="/app/perfil">Revisar empresa <ArrowRight size={16} /></Link>
      </section>

      <div className="dashboard-grid">
        {!completed && nextStepCard}

        <section className="card level-card real-level-card" aria-labelledby="real-level-title">
          <span id="real-level-title" className="card-label">Nivel general</span>
          <div className="empty-score">{completed ? diagnostic.score === null ? "Sin evaluar" : Math.round(diagnostic.score) : "—"}{(!completed || diagnostic.score !== null) && <span>/ 100</span>}</div>
          <div className="real-level-copy">
            <strong>{completed ? scoreLabel(diagnostic.score) : started ? "Diagnóstico en curso" : "Sin evaluar"}</strong>
            <p>{completed ? validated ? "Resultado validado y congelado por Nexaro." : "Resultado provisional pendiente de revisión por Nexaro." : started ? `${diagnostic?.answered ?? 0} de ${diagnostic?.total ?? 0} respuestas guardadas.` : "Completa el primer diagnóstico para calcular el nivel de madurez digital."}</p>
          </div>
          <Link className="light-action" href={completed ? "/app/hoja-de-ruta" : "/app/diagnostico"}>{completed ? "Abrir hoja de ruta" : started ? "Continuar diagnóstico" : "Ir al diagnóstico"} <ArrowRight size={16} /></Link>
        </section>

        <section className="card dimensions-card real-dimensions-card" aria-labelledby="real-dimensions-title">
          <div className="card-head"><div><h2 id="real-dimensions-title">Seis dimensiones</h2><p>{started ? "Resultados calculados con las respuestas disponibles." : "Se calcularán a partir de tus respuestas."}</p></div><span className="pending-chip">{validated ? "Validado" : completed ? "Por validar" : started ? "En curso" : "Pendiente"}</span></div>
          <div className="dimension-list">
            {diagnostic?.dimensions.map((dimension) => (
              <div className={`dimension-row ${dimension.score === null ? "empty-dimension-row" : ""}`} key={dimension.key} style={{ "--dimension-color": dimension.color } as CSSProperties}>
                <div className="dimension-name"><span className="dimension-code">{dimension.code}</span><span>{dimension.name}</span></div>
                <div className="bar-track" aria-label={`${dimension.name}: ${dimension.score === null ? "sin evaluar" : `${Math.round(dimension.score)} de 100`}`}><span style={{ width: `${dimension.score ?? 0}%` }} /></div>
                <span className="dimension-score">{dimension.score === null ? "Sin evaluar" : Math.round(dimension.score)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card honest-empty-card roadmap-task-preview">
          <span className="honest-empty-icon"><ListChecks size={21} /></span>
          <div className="roadmap-task-preview-head"><h2>Próximas tareas</h2><span>{completed ? "Desde tu resultado" : "Pendiente"}</span></div>
          {tasks.length ? (
            <div className="dashboard-roadmap-tasks">
              {tasks.map((task) => (
                <div key={task.id} style={{ "--task-color": task.color } as CSSProperties}>
                  <i />
                  <span><strong>{task.title}</strong><small>{task.code} · {task.dimension} · {task.period}</small></span>
                </div>
              ))}
            </div>
          ) : <p>{completed ? "No hay acciones para las dimensiones marcadas como no aplicables." : "Se generarán automáticamente al finalizar el diagnóstico."}</p>}
          <Link href={completed ? "/app/tareas" : "/app/diagnostico"}>{completed ? "Ver plan de tareas" : "Completar diagnóstico"} <ArrowRight size={15} /></Link>
        </section>

        {emptySections.map(({ title, description, icon: Icon, href, link }) => (
          <section className="card honest-empty-card" key={title}>
            <span className="honest-empty-icon"><Icon size={21} /></span>
            <div><h2>{title}</h2><p>{description}</p></div>
            <Link href={href}>{link} <ArrowRight size={15} /></Link>
          </section>
        ))}

        {completed && nextStepCard}
      </div>
    </main>
  );
}
