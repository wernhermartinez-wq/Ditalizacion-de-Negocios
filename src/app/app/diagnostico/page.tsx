import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, Info, PencilLine } from "lucide-react";
import { DiagnosticQuestionnaire } from "@/components/app/diagnostic-questionnaire";
import { AuthMessage } from "@/components/auth/message";
import { dimensionScores, scoreLabel } from "@/lib/diagnostics";
import { dimensionsFromSnapshot, loadDiagnosticSnapshot } from "@/lib/diagnostic-snapshots";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { reopenDiagnostic } from "./actions";

export const metadata: Metadata = { title: "Diagnóstico" };

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function DiagnosticPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (!userId) redirect("/login");

  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const [questionnaireResult, params] = await Promise.all([
    supabase.from("diagnostic_questionnaires").select("*").eq("is_active", true).single(),
    searchParams,
  ]);
  const questionnaire = questionnaireResult.data;
  if (questionnaireResult.error || !questionnaire) throw new Error("No hay un cuestionario activo disponible.");

  const [questionsResult, diagnosticResult] = await Promise.all([
    supabase.from("diagnostic_questions").select("*").eq("questionnaire_id", questionnaire.id).order("position"),
    supabase
      .from("diagnostics")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("questionnaire_id", questionnaire.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (questionsResult.error || diagnosticResult.error) throw new Error("No se pudo cargar el diagnóstico.");

  const questions = questionsResult.data ?? [];
  const questionIds = questions.map((question) => question.id);
  const diagnostic = diagnosticResult.data;
  const [responsesResult, dependenciesResult] = await Promise.all([
    diagnostic
      ? supabase.from("diagnostic_responses").select("*").eq("diagnostic_id", diagnostic.id)
      : Promise.resolve({ data: [], error: null }),
    questionIds.length
      ? supabase.from("diagnostic_question_dependencies").select("*").in("child_question_id", questionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (responsesResult.error || dependenciesResult.error) throw new Error("No se pudo cargar el cuestionario guardado.");

  const responses = responsesResult.data ?? [];
  const responseByQuestion = new Map(responses.map((response) => [response.question_id, response.value]));
  const isCompleted = diagnostic?.status === "completed" || diagnostic?.status === "validated";
  const isValidated = diagnostic?.status === "validated";
  const snapshot = isValidated && diagnostic ? await loadDiagnosticSnapshot(supabase, diagnostic.id) : null;
  const scores = snapshot ? dimensionsFromSnapshot(snapshot.scoreRows) : dimensionScores(questions, responses);

  return (
    <main className="page-content diagnostic-page">
      <div className="page-heading diagnostic-heading">
        <div>
          <p className="eyebrow">{organization.name} · Evaluación inicial</p>
          <h1>{questionnaire.title}</h1>
          <p className="page-description">{questionnaire.description}</p>
        </div>
        <div className="diagnostic-heading-actions">
          <span className="real-data-badge">
            {isCompleted ? <CheckCircle2 size={16} /> : <ClipboardCheck size={16} />}
            {isValidated ? "Validado por Nexaro" : isCompleted ? "Pendiente de validación" : `${responses.length} de ${questions.length}`}
          </span>
          {diagnostic?.status === "completed" && (
            <form action={reopenDiagnostic}>
              <button className="secondary-action" type="submit"><PencilLine size={16} /> Corregir diagnóstico</button>
            </form>
          )}
          {isCompleted && <Link className="button-primary" href="/app/hoja-de-ruta">Ver hoja de ruta <ArrowRight size={16} /></Link>}
        </div>
      </div>

      <AuthMessage error={params.error} success={params.success} />

      <div className="diagnostic-scope-note">
        <Info size={18} />
        <p><strong>Diagnóstico comercial y operativo de Nexaro.</strong> Recorre desde la presencia digital hasta la fidelización y evalúa las capacidades internas que sostienen ese crecimiento.</p>
      </div>

      {isCompleted ? (
        <section className="diagnostic-results" aria-labelledby="diagnostic-result-title">
          <article className="card diagnostic-overall-card">
            <span className="card-label">{isValidated ? "Resultado validado" : "Resultado provisional"}</span>
            <div className="diagnostic-score">{diagnostic.provisional_score === null ? "Sin evaluar" : Math.round(diagnostic.provisional_score)}{diagnostic.provisional_score !== null && <span>/ 100</span>}</div>
            <h2 id="diagnostic-result-title">{scoreLabel(diagnostic.provisional_score)}</h2>
            <p>{isValidated ? "Validado y congelado por Nexaro" : "Pendiente de revisión por Nexaro"} a partir de {responses.filter((response) => response.value > 0).length} respuestas aplicables de {responses.length} registradas para {organization.name}.</p>
            <Link className="diagnostic-overall-action" href="/app/hoja-de-ruta">Abrir plan de 90 días <ArrowRight size={16} /></Link>
          </article>
          <article className="card diagnostic-dimensions-result">
            <div className="card-head"><div><h2>Resultado por dimensión</h2><p>Una lectura inicial para orientar las siguientes prioridades.</p></div><BarChart3 size={20} /></div>
            <div className="dimension-list">
              {scores.map((dimension) => (
                <div className="dimension-row" key={dimension.key} style={{ "--dimension-color": dimension.color } as CSSProperties}>
                  <div className="dimension-name"><span className="dimension-code">{dimension.code}</span><span>{dimension.name}</span></div>
                  <div className="bar-track" aria-label={`${dimension.name}: ${dimension.score === null ? "Sin evaluar" : `${Math.round(dimension.score)} de 100`}`}><span style={{ width: `${dimension.score ?? 0}%` }} /></div>
                  <span className="dimension-score">{dimension.score === null ? "Sin evaluar" : Math.round(dimension.score)}</span>
                </div>
              ))}
            </div>
          </article>
          <Link className="card diagnostic-roadmap-cta" href="/app/hoja-de-ruta">
            <span><strong>Abrir tu hoja de ruta de 90 días</strong><small>Acciones ordenadas desde las brechas detectadas en este diagnóstico.</small></span>
            <ArrowRight size={20} />
          </Link>
        </section>
      ) : (
        <DiagnosticQuestionnaire
          questions={questions}
          dependencies={dependenciesResult.data ?? []}
          initialAnswers={Object.fromEntries(responseByQuestion)}
        />
      )}
    </main>
  );
}
