import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Target } from "lucide-react";
import { getCurrentOrganization } from "@/lib/organizations";
import { loadDiagnosticSnapshot, roadmapFromSnapshot } from "@/lib/diagnostic-snapshots";
import { buildRoadmap } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hoja de ruta" };

export default async function RoadmapPage() {
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
    .in("status", ["completed", "validated"])
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (diagnosticError) throw new Error("No se pudo cargar el diagnóstico completado.");

  if (!diagnostic) {
    return (
      <main className="page-content roadmap-page roadmap-empty">
        <section className="state-card">
          <span className="state-visual"><ClipboardList size={24} /></span>
          <p className="eyebrow">Hoja de ruta</p>
          <h1>Primero necesitamos conocer la situación real.</h1>
          <p>Completa el nuevo diagnóstico comercial para ordenar las brechas desde la visibilidad hasta la fidelización y convertirlas en acciones de 30, 60 y 90 días.</p>
          <Link className="button-primary" href="/app/diagnostico">Ir al diagnóstico <ArrowRight size={16} /></Link>
        </section>
      </main>
    );
  }

  const [questionsResult, responsesResult] = await Promise.all([
    supabase.from("diagnostic_questions").select("*").eq("questionnaire_id", diagnostic.questionnaire_id).order("position"),
    supabase.from("diagnostic_responses").select("*").eq("diagnostic_id", diagnostic.id),
  ]);
  if (questionsResult.error || responsesResult.error) throw new Error("No se pudo generar la hoja de ruta.");

  const isValidated = diagnostic.status === "validated";
  const snapshot = isValidated ? await loadDiagnosticSnapshot(supabase, diagnostic.id) : null;
  const roadmap = snapshot ? roadmapFromSnapshot(snapshot.itemRows) : buildRoadmap(questionsResult.data ?? [], responsesResult.data ?? []);
  const resultDate = diagnostic.validated_at ?? diagnostic.completed_at;
  const completedDate = resultDate
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(resultDate))
    : "hoy";

  return (
    <main className="page-content roadmap-page">
      <div className="page-heading roadmap-heading">
        <div>
          <p className="eyebrow">{organization.name} · Hoja de ruta</p>
          <h1>Un plan de 90 días basado en tus brechas reales.</h1>
          <p className="page-description">Prioridades {isValidated ? "validadas y congeladas" : "provisionales"} desde el diagnóstico del {completedDate}. Cada bloque explica qué hacer y qué evidencia confirma el avance.</p>
        </div>
        <span className="real-data-badge"><CheckCircle2 size={16} /> {isValidated ? "Validada por Nexaro" : "Pendiente de validación"}</span>
      </div>

      <section className="roadmap-summary" aria-label="Resumen de la hoja de ruta">
        <div><small>Nivel actual</small><strong>{diagnostic.provisional_score === null ? "Sin evaluar" : Math.round(diagnostic.provisional_score)}{diagnostic.provisional_score !== null && <span>/100</span>}</strong></div>
        <div><small>Frentes de trabajo</small><strong>{roadmap.length}</strong></div>
        <div><small>Horizonte</small><strong>90<span> días</span></strong></div>
        <p><Target size={19} /> Empieza por los dos ámbitos con menor puntuación; evita abrir todas las iniciativas a la vez.</p>
      </section>

      <div className="roadmap-timeline">
        {[1, 2, 3].map((phase) => {
          const items = roadmap.filter((item) => item.phase === phase);
          return (
            <section className="roadmap-phase" key={phase} aria-labelledby={`roadmap-phase-${phase}`}>
              <header>
                <span>{phase}</span>
                <div><p>Fase {phase}</p><h2 id={`roadmap-phase-${phase}`}>{items[0]?.period}</h2></div>
              </header>
              <div className="roadmap-items">
                {items.map((item) => (
                  <article className="card roadmap-item" key={item.code} style={{ "--dimension-color": item.color } as CSSProperties}>
                    <div className="roadmap-item-meta">
                      <span className="dimension-code">{item.code}</span>
                      <span>{item.dimension}</span>
                      <b>{item.priority}</b>
                      <strong>{item.score === null ? "Sin evaluar" : Math.round(item.score)}</strong>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.objective}</p>
                    <ol>{item.actions.map((action) => <li key={action}>{action}</li>)}</ol>
                    <div className="roadmap-success"><CheckCircle2 size={17} /><span><small>Evidencia de avance</small><strong>{item.success}</strong></span></div>
                    {item.weaknesses.length > 0 && (
                      <details>
                        <summary>Por qué aparece esta prioridad</summary>
                        <ul>{item.weaknesses.map((weakness) => <li key={weakness}>{weakness}</li>)}</ul>
                      </details>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="roadmap-footer-actions">
        <Link className="secondary-action" href="/app/diagnostico"><ArrowLeft size={16} /> Ver diagnóstico</Link>
        <p>La hoja de ruta cambia cuando se completa un nuevo diagnóstico.</p>
      </div>
    </main>
  );
}
