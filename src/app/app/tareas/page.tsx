import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckSquare2, ListChecks } from "lucide-react";
import { getCurrentOrganization } from "@/lib/organizations";
import { buildRoadmap, roadmapTasks } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tareas" };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

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
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (diagnosticError) throw new Error("No se pudo cargar el diagnóstico completado.");

  if (!diagnostic) {
    return (
      <main className="page-content roadmap-page roadmap-empty">
        <section className="state-card">
          <span className="state-visual"><ListChecks size={24} /></span>
          <p className="eyebrow">Próximas tareas</p>
          <h1>Las tareas nacen del diagnóstico.</h1>
          <p>Finaliza la evaluación para generar acciones priorizadas desde las brechas reales de la empresa.</p>
          <Link className="button-primary" href="/app/diagnostico">Ir al diagnóstico <ArrowRight size={16} /></Link>
        </section>
      </main>
    );
  }

  const [questionsResult, responsesResult] = await Promise.all([
    supabase.from("diagnostic_questions").select("*").eq("questionnaire_id", diagnostic.questionnaire_id).order("position"),
    supabase.from("diagnostic_responses").select("*").eq("diagnostic_id", diagnostic.id),
  ]);
  if (questionsResult.error || responsesResult.error) throw new Error("No se pudieron generar las tareas.");
  const tasks = roadmapTasks(buildRoadmap(questionsResult.data ?? [], responsesResult.data ?? []));

  return (
    <main className="page-content tasks-page">
      <div className="page-heading tasks-heading">
        <div>
          <p className="eyebrow">{organization.name} · Ejecución</p>
          <h1>Próximas tareas derivadas del resultado.</h1>
          <p className="page-description">Las acciones mantienen el orden de la hoja de ruta. Primero se ejecutan las tareas de las dimensiones con menor puntuación.</p>
        </div>
        <Link className="secondary-action" href="/app/hoja-de-ruta">Ver hoja de ruta <ArrowRight size={16} /></Link>
      </div>

      <div className="task-plan">
        {[1, 2, 3].map((phase) => {
          const phaseTasks = tasks.filter((task) => task.phase === phase);
          return (
            <section className="card task-phase" key={phase}>
              <header><span>Fase {phase}</span><h2>{phaseTasks[0]?.period}</h2><small>{phaseTasks.length} acciones recomendadas</small></header>
              <div>
                {phaseTasks.map((task, index) => (
                  <article className="generated-task" key={task.id} style={{ "--task-color": task.color } as CSSProperties}>
                    <span className="generated-task-order">{index + 1}</span>
                    <CheckSquare2 size={18} />
                    <div><strong>{task.title}</strong><small><b>{task.code}</b> {task.dimension} · Prioridad {task.priority.toLowerCase()}</small></div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="tasks-source-note">Estas recomendaciones proceden del último diagnóstico. Cuando se complete uno nuevo, el orden y las acciones se recalcularán.</p>
    </main>
  );
}
