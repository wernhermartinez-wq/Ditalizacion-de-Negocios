import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import { AuthMessage } from "@/components/auth/message";
import { loadDiagnosticSnapshot, roadmapFromSnapshot } from "@/lib/diagnostic-snapshots";
import { getCurrentOrganization } from "@/lib/organizations";
import { buildRoadmap, roadmapTasks } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tareas" };

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function TasksPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const nexaroTasksResult = await supabase.from("nexaro_tasks").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false });
  if (nexaroTasksResult.error) throw new Error("No se pudieron cargar las tareas operativas.");
  const allNexaroTasks = nexaroTasksResult.data ?? [];
  const nexaroTasks = allNexaroTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled");
  const completedNexaroTasks = allNexaroTasks.filter((task) => task.status === "completed");

  const { data: questionnaire, error: questionnaireError } = await supabase
    .from("diagnostic_questionnaires")
    .select("id")
    .eq("is_active", true)
    .single();
  if (questionnaireError || !questionnaire) throw new Error("No se pudo cargar el diagnóstico activo.");

  const { data: diagnostic, error: diagnosticError } = await supabase
    .from("diagnostics")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("questionnaire_id", questionnaire.id)
    .in("status", ["completed", "validated"])
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (diagnosticError) throw new Error("No se pudo cargar el diagnóstico completado.");

  if (!diagnostic) {
    return (
      <main className="page-content tasks-page">
        <section className="state-card">
          <span className="state-visual"><ListChecks size={24} /></span>
          <p className="eyebrow">Próximas tareas</p>
          <h1>Las tareas nacen del diagnóstico.</h1>
          <p>{nexaroTasks.length ? `Nexaro ya ha asignado ${nexaroTasks.length} tarea(s) operativas. El diagnóstico añadirá la hoja de ruta completa.` : "Finaliza la evaluación para generar acciones priorizadas desde las brechas reales de la empresa."}</p>
          <Link className="button-primary" href="/app/diagnostico">Ir al diagnóstico <ArrowRight size={16} /></Link>
        </section>
        {nexaroTasks.length > 0 && <section className="card completed-tasks-card nexaro-assigned-tasks">
          <header><div><p className="eyebrow">Asignadas por Nexaro</p><h2>Tareas operativas pendientes</h2></div><span>{nexaroTasks.length}</span></header>
          <div className="completed-task-list">{nexaroTasks.map((task) => <article className="completed-task" key={task.id}><span className="completed-task-icon"><ListChecks size={18} /></span><div><strong>{task.title}</strong><small>{task.source === "visibility" ? "Visibilidad SEO e IA" : "Seguimiento Nexaro"} · Prioridad {task.priority}</small>{task.description && <p>{task.description}</p>}</div></article>)}</div>
        </section>}
        {completedNexaroTasks.length > 0 && <section className="card completed-tasks-card">
          <header><div><p className="eyebrow">Comprobadas por Nexaro</p><h2>Tareas realizadas</h2></div><span>{completedNexaroTasks.length}</span></header>
          <div className="completed-task-list">{completedNexaroTasks.map((task) => <article className="completed-task" key={task.id}><span className="completed-task-icon"><CheckCircle2 size={18} /></span><div><strong>{task.title}</strong><small>Realizada el {task.completed_at ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(task.completed_at)) : "—"}</small></div></article>)}</div>
        </section>}
      </main>
    );
  }

  const [questionsResult, responsesResult, completionsResult, params] = await Promise.all([
    supabase.from("diagnostic_questions").select("*").eq("questionnaire_id", diagnostic.questionnaire_id).order("position"),
    supabase.from("diagnostic_responses").select("*").eq("diagnostic_id", diagnostic.id),
    supabase.from("roadmap_task_completions").select("*").eq("diagnostic_id", diagnostic.id).order("completed_at", { ascending: false }),
    searchParams,
  ]);
  if (questionsResult.error || responsesResult.error || completionsResult.error) throw new Error("No se pudieron generar las tareas.");
  const snapshot = diagnostic.status === "validated" ? await loadDiagnosticSnapshot(supabase, diagnostic.id) : null;
  const tasks = roadmapTasks(snapshot ? roadmapFromSnapshot(snapshot.itemRows) : buildRoadmap(questionsResult.data ?? [], responsesResult.data ?? []));
  const taskByKey = new Map(tasks.map((task) => [task.id, task]));
  const completions = completionsResult.data ?? [];
  const completedKeys = new Set(completions.map((completion) => completion.task_key));
  const pendingTasks = tasks.filter((task) => !completedKeys.has(task.id));
  const completedDate = (value: string) => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

  return (
    <main className="page-content tasks-page">
      <div className="page-heading tasks-heading">
        <div>
          <p className="eyebrow">{organization.name} · Ejecución</p>
          <h1>Próximas tareas derivadas del resultado.</h1>
          <p className="page-description">Las acciones mantienen el orden de la hoja de ruta. {diagnostic.status === "validated" ? "Nexaro ha validado y congelado este plan." : "El plan es provisional hasta que Nexaro valide el diagnóstico."}</p>
        </div>
        <Link className="secondary-action" href="/app/hoja-de-ruta">Ver hoja de ruta <ArrowRight size={16} /></Link>
      </div>

      <AuthMessage error={params.error} success={params.success} />

      {nexaroTasks.length > 0 && <section className="card completed-tasks-card nexaro-assigned-tasks">
        <header><div><p className="eyebrow">Asignadas por Nexaro</p><h2>Tareas operativas</h2></div><span>{nexaroTasks.length}</span></header>
        <div className="completed-task-list">{nexaroTasks.map((task) => <article className="completed-task" key={task.id}><span className="completed-task-icon"><ListChecks size={18} /></span><div><strong>{task.title}</strong><small>{task.source === "visibility" ? "Visibilidad SEO e IA" : "Seguimiento Nexaro"} · Prioridad {task.priority}</small>{task.description && <p>{task.description}</p>}</div></article>)}</div>
      </section>}

      {pendingTasks.length ? <div className="task-plan">
        {[1, 2, 3].map((phase) => {
          const phaseTasks = pendingTasks.filter((task) => task.phase === phase);
          if (!phaseTasks.length) return null;
          return (
            <section className="card task-phase" key={phase}>
              <header><span>Fase {phase}</span><h2>{phaseTasks[0]?.period}</h2><small>{phaseTasks.length} {phaseTasks.length === 1 ? "pendiente" : "pendientes"}</small></header>
              <div>
                {phaseTasks.map((task, index) => (
                  <article className="generated-task" key={task.id} style={{ "--task-color": task.color } as CSSProperties}>
                    <span className="generated-task-order">{index + 1}</span>
                    <div><strong>{task.title}</strong><small><b>{task.code}</b> {task.dimension} · Prioridad {task.priority.toLowerCase()}</small></div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div> : (
        <section className="card tasks-complete-empty"><CheckCircle2 size={26} /><div><h2>Nexaro ha completado todas las tareas de esta hoja de ruta.</h2><p>Puedes consultar abajo el historial de actuaciones comprobadas.</p></div></section>
      )}

      <section className="card completed-tasks-card" aria-labelledby="completed-tasks-title">
        <header><div><p className="eyebrow">Historial</p><h2 id="completed-tasks-title">Tareas realizadas</h2></div><span>{completions.length + completedNexaroTasks.length}</span></header>
        {completions.length || completedNexaroTasks.length ? (
          <div className="completed-task-list">
            {completedNexaroTasks.map((task) => (
              <article className="completed-task" key={task.id}>
                <span className="completed-task-icon"><CheckCircle2 size={18} /></span>
                <div><strong>{task.title}</strong><small>{task.source === "visibility" ? "Visibilidad SEO e IA" : "Seguimiento Nexaro"} · Realizada el {task.completed_at ? completedDate(task.completed_at) : "—"}</small></div>
              </article>
            ))}
            {completions.map((completion) => {
              const task = taskByKey.get(completion.task_key);
              return (
                <article className="completed-task" key={completion.id}>
                  <span className="completed-task-icon"><CheckCircle2 size={18} /></span>
                  <div><strong>{completion.title}</strong><small>{task ? `${task.code} · ${task.dimension} · ` : ""}Realizada el {completedDate(completion.completed_at)}</small></div>
                </article>
              );
            })}
          </div>
        ) : <p className="completed-tasks-empty">Cuando Nexaro complete y compruebe una tarea, aparecerá aquí con su fecha.</p>}
      </section>
      <p className="tasks-source-note">{diagnostic.status === "validated" ? "Estas recomendaciones pertenecen al snapshot validado y no se recalculan." : "Estas recomendaciones son provisionales y se congelarán cuando Nexaro valide el diagnóstico."}</p>
    </main>
  );
}
