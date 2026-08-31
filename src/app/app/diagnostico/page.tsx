import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, Info } from "lucide-react";
import { DiagnosticQuestionnaire } from "@/components/app/diagnostic-questionnaire";
import { AuthMessage } from "@/components/auth/message";
import { dimensionScores, scoreLabel } from "@/lib/diagnostics";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

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
  const scores = dimensionScores(questions, responses);
  const isCompleted = diagnostic?.status === "completed";

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
            {isCompleted ? "Completado" : `${responses.length} de ${questions.length}`}
          </span>
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
            <span className="card-label">Resultado provisional</span>
            <div className="diagnostic-score">{Math.round(diagnostic.provisional_score ?? 0)}<span>/ 100</span></div>
            <h2 id="diagnostic-result-title">{scoreLabel(diagnostic.provisional_score)}</h2>
            <p>Calculado a partir de {responses.filter((response) => response.value > 0).length} respuestas aplicables de {responses.length} registradas para {organization.name}.</p>
            <Link className="diagnostic-overall-action" href="/app/hoja-de-ruta">Abrir plan de 90 días <ArrowRight size={16} /></Link>
          </article>
          <article className="card diagnostic-dimensions-result">
            <div className="card-head"><div><h2>Resultado por dimensión</h2><p>Una lectura inicial para orientar las siguientes prioridades.</p></div><BarChart3 size={20} /></div>
            <div className="dimension-list">
              {scores.map((dimension) => (
                <div className="dimension-row" key={dimension.key} style={{ "--dimension-color": dimension.color } as CSSProperties}>
                  <div className="dimension-name"><span className="dimension-code">{dimension.code}</span><span>{dimension.name}</span></div>
                  <div className="bar-track" aria-label={`${dimension.name}: ${Math.round(dimension.score ?? 0)} de 100`}><span style={{ width: `${dimension.score ?? 0}%` }} /></div>
                  <span className="dimension-score">{Math.round(dimension.score ?? 0)}</span>
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
