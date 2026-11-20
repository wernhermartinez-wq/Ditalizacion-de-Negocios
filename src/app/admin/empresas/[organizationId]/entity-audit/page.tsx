import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileSearch, History, LockKeyhole, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { isPlatformAdmin } from "@/lib/admin";
import { factualEvaluationPreview } from "@/lib/entity-audit-factual";
import { restaurantRoadmapStages } from "@/lib/restaurant-roadmap";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { activateEntityAudit, addObservation, createIdentityDraft, createInterventionProposal, linkInterventionProposal, reviewFactualFinding, reviewInterventionProposal, runFactualEvaluation, runInitialEntityAuditCampaign, saveEntityAuditCustomQuestions, saveFactualEvaluationBudget, saveIdentityDraft, updateInterventionProposal, validateIdentity } from "./actions";

export const metadata: Metadata = { title: "Entity Audit · Control Nexaro" };

type PageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

function list(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function openingHours(value: unknown) {
  if (value && typeof value === "object" && "text" in value) return String(value.text ?? "");
  return "";
}

export default async function EntityAuditAdminPage({ params, searchParams }: PageProps) {
  const [{ organizationId }, messages, authClient] = await Promise.all([params, searchParams, createClient()]);
  const { data: authData } = await authClient.auth.getClaims();
  const userId = typeof authData?.claims?.sub === "string" ? authData.claims.sub : null;
  if (!userId || !(await isPlatformAdmin(authClient, userId))) redirect("/app");
  const supabase = createAdminClient();
  const [{ data: organization }, { data: auditCase }] = await Promise.all([
    supabase.from("organizations").select("id, name, legal_name, website, city, country").eq("id", organizationId).maybeSingle(),
    supabase.from("entity_audit_cases").select("*").eq("organization_id", organizationId).maybeSingle(),
  ]);
  if (!organization) notFound();

  if (!auditCase) {
    return <main className="admin-page entity-audit-page">
      <Link className="admin-back" href={`/admin/empresas/${organizationId}`}><ArrowLeft size={16} /> Volver al restaurante</Link>
      <AuthMessage error={messages.error} success={messages.success} />
      <section className="admin-panel entity-audit-empty"><FileSearch size={34} /><p>Entity Audit</p><h1>Activar el expediente de {organization.name}</h1><span>Esta acción representa la activación administrativa real del acompañamiento. El simple registro del restaurante no crea el expediente.</span><form action={activateEntityAudit.bind(null, organizationId)}><SubmitButton pendingLabel="Activando…">Activar acompañamiento y expediente</SubmitButton></form></section>
    </main>;
  }

  const [versionsResult, sourcesResult, observationsResult, questionSetsResult, campaignsResult] = await Promise.all([
    supabase.from("entity_identity_versions").select("*").eq("case_id", auditCase.id).order("version_number", { ascending: false }),
    supabase.from("entity_sources").select("*").eq("case_id", auditCase.id).order("created_at", { ascending: false }),
    supabase.from("entity_observations").select("*").eq("case_id", auditCase.id).order("observed_at", { ascending: false }),
    supabase.from("entity_audit_question_sets").select("*").or(`organization_id.is.null,organization_id.eq.${organizationId}`).order("version_number", { ascending: false }),
    supabase.from("entity_audit_campaigns").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
  ]);
  if (versionsResult.error || sourcesResult.error || observationsResult.error || questionSetsResult.error || campaignsResult.error) throw new Error("No se pudo cargar el expediente Entity Audit.");
  const versions = versionsResult.data ?? [];
  const draft = versions.find((version) => version.status === "draft");
  const current = versions.find((version) => version.id === auditCase.current_identity_version_id);
  const sourceMap = new Map((sourcesResult.data ?? []).map((source) => [source.id, source]));
  const standardSet = questionSetsResult.data?.find((set) => set.set_type === "standard");
  const customSet = questionSetsResult.data?.find((set) => set.set_type === "custom");
  const setIds = [standardSet?.id, customSet?.id].filter((id): id is string => Boolean(id));
  const questionsResult = setIds.length
    ? await supabase.from("entity_audit_questions").select("*").in("question_set_id", setIds).order("position")
    : { data: [], error: null };
  if (questionsResult.error) throw new Error("No se pudieron cargar las preguntas Entity Audit.");
  const standardQuestions = (questionsResult.data ?? []).filter((question) => question.question_set_id === standardSet?.id);
  const customQuestions = (questionsResult.data ?? []).filter((question) => question.question_set_id === customSet?.id);
  const campaigns = campaignsResult.data ?? [];
  const evaluableCampaigns = campaigns.filter((campaign) => ["completed", "partial"].includes(campaign.status));
  const [budgetsResult, evaluationRunsResult, findingsResult, reviewsResult, proposalsResult, proposalFindingsResult, tasksResult, previews] = await Promise.all([
    supabase.from("entity_audit_evaluation_budgets").select("*").eq("organization_id", organizationId),
    supabase.from("entity_audit_evaluation_runs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("entity_audit_findings").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("entity_audit_finding_reviews").select("*").eq("organization_id", organizationId),
    supabase.from("entity_audit_intervention_proposals").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("entity_audit_proposal_findings").select("*").eq("organization_id", organizationId).order("created_at"),
    supabase.from("nexaro_tasks").select("id,title,status,source_reference").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    Promise.all(evaluableCampaigns.map(async (campaign) => {
      try {
        const preview = await factualEvaluationPreview(supabase, campaign.id);
        return [campaign.id, preview.estimate] as const;
      } catch {
        return [campaign.id, null] as const;
      }
    })),
  ]);
  if (budgetsResult.error || evaluationRunsResult.error || findingsResult.error || reviewsResult.error || proposalsResult.error || proposalFindingsResult.error || tasksResult.error) {
    throw new Error("No se pudo cargar la evaluación factual del expediente.");
  }
  const budgets = new Map((budgetsResult.data ?? []).map((budget) => [budget.campaign_id, budget]));
  const evaluationRuns = evaluationRunsResult.data ?? [];
  const findings = findingsResult.data ?? [];
  const reviews = new Map((reviewsResult.data ?? []).map((review) => [review.finding_id, review]));
  const estimates = new Map(previews);
  const confirmedFindings = findings.filter((finding) => finding.review_status === "confirmed");
  const proposals = proposalsResult.data ?? [];
  const proposalFindings = proposalFindingsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const factualExecutionEnabled = process.env.ENTITY_AUDIT_FACTUAL_EXECUTION_ENABLED === "true";

  return <main className="admin-page entity-audit-page">
    <Link className="admin-back" href={`/admin/empresas/${organizationId}`}><ArrowLeft size={16} /> Volver al restaurante</Link>
    <div className="entity-audit-heading"><div><p>Expediente Entity Audit</p><h1>Identidad comercial de {organization.name}</h1><span>Separa datos declarados, observaciones externas e identidad oficial validada.</span></div><b className={`entity-status status-${auditCase.status}`}>{auditCase.status === "ready" ? "Identidad validada" : "Validación pendiente"}</b></div>
    <AuthMessage error={messages.error} success={messages.success} />

    <section className="entity-audit-security-grid">
      <article><ShieldCheck /><strong>Validación exclusiva de Nexaro</strong><span>El restaurante no puede aprobar ni editar su identidad oficial.</span></article>
      <article><LockKeyhole /><strong>Auditoría inicial bloqueada</strong><span>{auditCase.status === "ready" ? "Identidad preparada para una futura campaña." : "No puede iniciarse hasta validar un borrador."}</span></article>
      <article><History /><strong>Historial inmutable</strong><span>{versions.length} {versions.length === 1 ? "versión conservada" : "versiones conservadas"}.</span></article>
    </section>

    {draft ? <section className="admin-panel entity-identity-editor">
      <div className="admin-section-title"><div><p>Versión {draft.version_number} · Borrador</p><h2>Preparar identidad oficial</h2></div><span>Editable sólo por Nexaro</span></div>
      <form action={saveIdentityDraft.bind(null, organizationId, draft.id)} className="entity-identity-form">
        <label>Nombre comercial *<input name="commercialName" required minLength={2} maxLength={160} defaultValue={draft.commercial_name} /></label>
        <label>Razón social<input name="legalName" maxLength={200} defaultValue={draft.legal_name ?? ""} /></label>
        <label className="wide">Variantes del nombre<textarea name="nameVariants" rows={2} defaultValue={draft.name_variants.join("\n")} placeholder="Una por línea" /></label>
        <label>Sitio web<input name="websiteUrl" defaultValue={draft.website_url ?? ""} /></label>
        <label>Teléfono<input name="phone" defaultValue={draft.phone ?? ""} /></label>
        <label>Dirección<input name="addressLine1" defaultValue={draft.address_line_1 ?? ""} /></label>
        <label>Complemento<input name="addressLine2" defaultValue={draft.address_line_2 ?? ""} /></label>
        <label>Código postal<input name="postalCode" defaultValue={draft.postal_code ?? ""} /></label>
        <label>Ciudad<input name="city" defaultValue={draft.city ?? ""} /></label>
        <label>Provincia o región<input name="region" defaultValue={draft.region ?? ""} /></label>
        <label>País (ISO)<input name="countryCode" required maxLength={2} defaultValue={draft.country_code} /></label>
        <label className="wide">Horario<textarea name="openingHours" rows={3} defaultValue={openingHours(draft.opening_hours)} /></label>
        <label>Categorías<textarea name="categories" rows={3} defaultValue={draft.categories.join("\n")} /></label>
        <label>Especialidades<textarea name="specialties" rows={3} defaultValue={draft.specialties.join("\n")} /></label>
        <label>Servicios<textarea name="services" rows={3} defaultValue={draft.services.join("\n")} /></label>
        <label>Carta<input name="menuUrl" defaultValue={draft.menu_url ?? ""} /></label>
        <label>Reservas<input name="reservationUrl" defaultValue={draft.reservation_url ?? ""} /></label>
        <label>Contacto<input name="contactUrl" defaultValue={draft.contact_url ?? ""} /></label>
        <label className="wide">Perfiles oficiales<textarea name="officialProfiles" rows={3} defaultValue={list(draft.official_profiles)} placeholder="Una URL por línea" /></label>
        <div className="wide entity-form-actions"><span>Guardar no valida: conserva el documento como borrador interno.</span><SubmitButton pendingLabel="Guardando…">Guardar borrador</SubmitButton></div>
      </form>
      <form action={validateIdentity.bind(null, organizationId, draft.id)} className="entity-validation-form"><label>Nota de validación<textarea name="validationNote" rows={2} maxLength={1000} placeholder="Criterio y fuentes revisadas" /></label><div><strong>Al validar, esta versión queda inmutable.</strong><SubmitButton pendingLabel="Validando…">Validar identidad oficial</SubmitButton></div></form>
    </section> : <section className="admin-panel entity-current-identity"><div className="admin-section-title"><div><p>Identidad vigente</p><h2>{current?.commercial_name ?? organization.name}</h2></div><span>Versión {current?.version_number ?? "—"}</span></div><p>La identidad está validada e inmutable. Para corregirla debe crearse una nueva versión.</p><form action={createIdentityDraft.bind(null, organizationId, auditCase.id)}><SubmitButton pendingLabel="Creando…">Crear nueva versión</SubmitButton></form></section>}

    <div className="entity-audit-columns">
      <section className="admin-panel"><div className="admin-section-title"><div><p>Fuentes y hallazgos</p><h2>Registrar información</h2></div><span>Uso interno</span></div><form action={addObservation.bind(null, organizationId, auditCase.id)} className="entity-observation-form"><label>Tipo<select name="observationKind"><option value="declared">Declarado por el cliente</option><option value="observed">Observado externamente</option></select></label><label>Campo<input name="fieldKey" required placeholder="Ej. teléfono" /></label><label className="wide">Valor<textarea name="value" required rows={2} /></label><label>Tipo de fuente<select name="sourceType"><option value="restaurant">Restaurante</option><option value="website">Web</option><option value="google_business">Google Business</option><option value="directory">Directorio</option><option value="social">Red social</option><option value="reservation">Reservas</option><option value="menu">Carta</option><option value="other">Otra</option></select></label><label>Nombre de la fuente<input name="sourceName" /></label><label className="wide">URL de la fuente<input name="sourceUrl" /></label><label className="wide">Observación interna<textarea name="internalNote" rows={2} /></label><div className="wide"><SubmitButton pendingLabel="Registrando…">Registrar dato</SubmitButton></div></form></section>
      <section className="admin-panel"><div className="admin-section-title"><div><p>Observaciones internas</p><h2>Contraste de información</h2></div><span>{observationsResult.data?.length ?? 0}</span></div><div className="entity-observation-list">{(observationsResult.data ?? []).map((observation) => <article key={observation.id}><b>{observation.observation_kind === "declared" ? "Declarado" : "Observado"}</b><strong>{observation.field_key}</strong><span>{typeof observation.value === "string" ? observation.value : JSON.stringify(observation.value)}</span><small>{observation.source_id ? sourceMap.get(observation.source_id)?.name : "Sin fuente externa"}{observation.internal_note ? ` · ${observation.internal_note}` : ""}</small></article>)}{!observationsResult.data?.length ? <p>Aún no hay datos declarados u observados.</p> : null}</div></section>
    </div>

    <section className="admin-panel entity-audit-campaigns">
      <div className="admin-section-title"><div><p>Entrega 2 · Medición inicial</p><h2>Preguntas y campaña de visibilidad en IA</h2></div><span>{standardQuestions.length} estándar · {customQuestions.length}/5 personalizadas</span></div>
      <p>La campaña conserva la versión exacta de la identidad, las preguntas y las respuestas originales de OpenAI, Gemini y Perplexity. Su ejecución es exclusivamente manual.</p>
      <div className="entity-audit-columns">
        <div>
          <h3>Preguntas estándar · versión {standardSet?.version_number ?? "—"}</h3>
          <ol className="entity-question-list">{standardQuestions.map((question) => <li key={question.id}><b>{question.code}</b><span>{question.prompt_template}</span></li>)}</ol>
        </div>
        <form action={saveEntityAuditCustomQuestions.bind(null, organizationId)} className="entity-observation-form">
          <div className="wide"><h3>Preguntas personalizadas</h3><small>Guardar crea una nueva versión inmutable. Deja vacías las posiciones que no necesites.</small></div>
          {Array.from({ length: 5 }, (_, index) => <label className="wide" key={index}>Pregunta {index + 1}<textarea name={`question${index + 1}`} rows={2} minLength={10} maxLength={800} defaultValue={customQuestions[index]?.prompt_template ?? ""} /></label>)}
          <div className="wide"><SubmitButton pendingLabel="Versionando…">Guardar nueva versión</SubmitButton></div>
        </form>
      </div>
      <div className="entity-campaign-actions">
        <div><strong>Campañas de este mes: {campaigns.filter((campaign) => new Date(campaign.created_at).getUTCMonth() === new Date().getUTCMonth() && new Date(campaign.created_at).getUTCFullYear() === new Date().getUTCFullYear() && ["prepared", "running", "completed", "partial"].includes(campaign.status)).length}/2</strong><span>Máximo 15 preguntas × 3 proveedores = 45 consultas. Los reintentos internos no crean consultas adicionales en el historial.</span></div>
        {auditCase.status === "ready" && current ? <form action={runInitialEntityAuditCampaign.bind(null, organizationId)}><SubmitButton pendingLabel="Ejecutando…">Ejecutar medición inicial</SubmitButton></form> : <b>Valida primero la identidad comercial.</b>}
      </div>
      <div className="entity-version-list">{campaigns.map((campaign) => <article key={campaign.id}><b>#{campaign.campaign_number}</b><span><strong>{campaign.status === "completed" ? "Completada" : campaign.status === "partial" ? "Parcial" : campaign.status === "failed" ? "Fallida" : campaign.status === "running" ? "En ejecución" : "Preparada"}</strong><small>Identidad {campaign.identity_version_id === current?.id ? `v${current.version_number}` : campaign.identity_version_id}</small></span><em>{new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.created_at))}</em></article>)}{!campaigns.length ? <p>Aún no se ejecutó ninguna campaña.</p> : null}</div>
    </section>

    <section className="admin-panel entity-factual-panel">
      <div className="admin-section-title"><div><p>Entrega 3 · Evaluación factual</p><h2>Contrastar respuestas con la identidad validada</h2></div><span>{findings.length} hallazgos</span></div>
      <p className="entity-factual-intro">Sólo reutiliza respuestas ya registradas. La estimación se calcula antes de reservar presupuesto, pero no garantiza el coste final. Todas las discrepancias requieren revisión humana.</p>
      <div className="entity-factual-campaigns">
        {evaluableCampaigns.map((campaign) => {
          const budget = budgets.get(campaign.id);
          const estimate = estimates.get(campaign.id);
          const latestRun = evaluationRuns.find((run) => run.campaign_id === campaign.id);
          const budgetUsd = budget?.budget_usd ?? 0.3;
          const spentUsd = budget?.spent_usd ?? 0;
          const reservedUsd = budget?.reserved_usd ?? 0;
          const remainingUsd = Math.max(0, budgetUsd - spentUsd - reservedUsd);
          return <article key={campaign.id} className="entity-factual-campaign">
            <header><div><b>Campaña #{campaign.campaign_number}</b><span>{campaign.status === "completed" ? "Visibilidad completada" : "Visibilidad parcial"}</span></div><strong>{latestRun?.status === "completed" ? "Evaluada" : latestRun?.status === "running" ? "En evaluación" : latestRun?.status === "failed" ? "Fallida" : "Sin evaluar"}</strong></header>
            <div className="entity-factual-costs"><span>Presupuesto <b>${budgetUsd.toFixed(3)}</b></span><span>Consumido <b>${spentUsd.toFixed(6)}</b></span><span>Reservado <b>${reservedUsd.toFixed(6)}</b></span><span>Disponible <b>${remainingUsd.toFixed(6)}</b></span><span>Estimación previa <b>{estimate ? `$${estimate.estimatedUsd.toFixed(6)}` : "No disponible"}</b></span></div>
            <div className="entity-factual-controls">
              <form action={saveFactualEvaluationBudget.bind(null, organizationId, campaign.id)}><label>Presupuesto USD<input name="budgetUsd" type="number" min="0.01" max="10" step="0.01" defaultValue={budgetUsd.toFixed(2)} /></label><SubmitButton pendingLabel="Guardando…">Guardar límite</SubmitButton></form>
              {factualExecutionEnabled && estimate
                ? <form action={runFactualEvaluation.bind(null, organizationId, campaign.id)}><SubmitButton pendingLabel="Evaluando…">Ejecutar evaluación factual</SubmitButton></form>
                : <span className="entity-factual-disabled">Llamadas pagadas desactivadas. La interfaz queda preparada para una prueba real autorizada.</span>}
            </div>
            {latestRun ? <small>Última ejecución: {latestRun.model} · estimada ${latestRun.estimated_cost_usd.toFixed(6)}{latestRun.actual_cost_usd === null ? "" : ` · registrada $${latestRun.actual_cost_usd.toFixed(6)}`}{latestRun.error_message ? ` · ${latestRun.error_message}` : ""}</small> : null}
          </article>;
        })}
        {!evaluableCampaigns.length ? <p>No hay campañas con respuestas registradas para evaluar.</p> : null}
      </div>
      <div className="entity-factual-findings">
        <h3>Hallazgos pendientes de criterio humano</h3>
        {findings.map((finding) => {
          const review = reviews.get(finding.id);
          return <article key={finding.id}>
            <header><div><b>{finding.field_key}</b><strong>{finding.summary}</strong></div><span className={`entity-review-status status-${finding.review_status}`}>{finding.review_status === "confirmed" ? "Confirmado" : finding.review_status === "dismissed" ? "Descartado" : "Pendiente"}</span></header>
            <p>{finding.evidence_summary}</p><small>{finding.classification} · {finding.provider_count} proveedor(es) · {finding.response_count} respuesta(s)</small>
            <form action={reviewFactualFinding.bind(null, organizationId, finding.id)}><label>Decisión<select name="reviewStatus" defaultValue={finding.review_status}><option value="pending">Mantener pendiente</option><option value="confirmed">Confirmar</option><option value="dismissed">Descartar</option></select></label><label className="wide">Nota interna de Nexaro<textarea name="internalNote" rows={2} maxLength={2000} defaultValue={review?.internal_note ?? ""} /></label><SubmitButton pendingLabel="Guardando…">Guardar revisión</SubmitButton></form>
          </article>;
        })}
        {!findings.length ? <p>Aún no existen hallazgos factuales.</p> : null}
      </div>
    </section>

    <section className="admin-panel entity-proposals-panel">
      <div className="admin-section-title"><div><p>Entrega 4 · Intervenciones</p><h2>Propuestas basadas en hallazgos confirmados</h2></div><span>{proposals.length} propuestas</span></div>
      <p className="entity-factual-intro">Crear o aprobar una propuesta no genera tareas ni cambia fases. La vinculación con una actuación existente siempre requiere una acción administrativa separada.</p>
      <form action={createInterventionProposal.bind(null, organizationId)} className="entity-proposal-create">
        <fieldset><legend>Hallazgos confirmados de origen</legend>{confirmedFindings.map((finding) => <label key={finding.id}><input type="checkbox" name="findingId" value={finding.id} /><span><b>{finding.field_key}</b>{finding.summary}<small>{finding.evidence_summary}</small></span></label>)}{!confirmedFindings.length ? <p>No hay hallazgos confirmados disponibles.</p> : null}</fieldset>
        <label>Fase existente<select name="phase" required defaultValue="3">{restaurantRoadmapStages.map((stage) => <option value={stage.stage} key={stage.stage}>Fase {stage.stage} · {stage.title}</option>)}</select></label>
        <label className="wide">Problema verificado<textarea name="verifiedProblem" required minLength={3} maxLength={2000} rows={3} placeholder="Describe sólo lo demostrado por los hallazgos confirmados." /></label>
        <label className="wide">Hipótesis, si existe<textarea name="hypothesis" maxLength={2000} rows={2} placeholder="Posible explicación aún no demostrada. No la presentes como hecho." /></label>
        <label className="wide">Acción sugerida<textarea name="suggestedAction" required minLength={3} maxLength={2000} rows={3} /></label>
        <label className="wide">Resultado esperado<textarea name="expectedResult" required minLength={3} maxLength={2000} rows={3} placeholder="Resultado comprobable esperado, no una mejora todavía demostrada." /></label>
        <label className="wide">Nota interna<textarea name="internalNote" maxLength={2000} rows={2} /></label>
        <div className="wide"><SubmitButton pendingLabel="Creando…">Crear borrador de propuesta</SubmitButton></div>
      </form>
      <div className="entity-proposal-list">{proposals.map((proposal) => {
        const sources = proposalFindings.filter((source) => source.proposal_id === proposal.id);
        const linkedTask = tasks.find((task) => task.id === proposal.linked_task_id);
        return <article key={proposal.id} className={`status-${proposal.review_status}`}>
          <header><div><small>Fase {proposal.phase} · {restaurantRoadmapStages.find((stage) => stage.stage === proposal.phase)?.title}</small><h3>{proposal.verified_problem}</h3></div><b>{proposal.review_status === "approved" ? "Aprobada" : proposal.review_status === "dismissed" ? "Descartada" : "Borrador"}</b></header>
          <dl><div><dt>Hecho verificado</dt><dd>{proposal.verified_problem}</dd></div><div><dt>Hipótesis</dt><dd>{proposal.hypothesis ?? "No declarada"}</dd></div><div><dt>Recomendación</dt><dd>{proposal.suggested_action}</dd></div><div><dt>Resultado esperado</dt><dd>{proposal.expected_result}</dd></div></dl>
          <details><summary>Evidencia y origen ({sources.length})</summary>{sources.map((source) => <p key={source.finding_id}><b>{source.classification}</b> · {source.verified_fact}<br /><small>{source.evidence_snapshot} · campaña {source.campaign_id} · identidad {source.identity_version_id}</small></p>)}</details>
          {proposal.review_status === "draft" ? <>
            <details className="entity-proposal-editor"><summary>Editar borrador</summary><form action={updateInterventionProposal.bind(null, organizationId, proposal.id)}><label>Fase<select name="phase" defaultValue={proposal.phase}>{restaurantRoadmapStages.map((stage) => <option value={stage.stage} key={stage.stage}>Fase {stage.stage} · {stage.title}</option>)}</select></label><label className="wide">Problema verificado<textarea name="verifiedProblem" required minLength={3} maxLength={2000} rows={3} defaultValue={proposal.verified_problem} /></label><label className="wide">Hipótesis<textarea name="hypothesis" maxLength={2000} rows={2} defaultValue={proposal.hypothesis ?? ""} /></label><label className="wide">Acción sugerida<textarea name="suggestedAction" required minLength={3} maxLength={2000} rows={3} defaultValue={proposal.suggested_action} /></label><label className="wide">Resultado esperado<textarea name="expectedResult" required minLength={3} maxLength={2000} rows={3} defaultValue={proposal.expected_result} /></label><label className="wide">Nota interna<textarea name="internalNote" maxLength={2000} rows={2} defaultValue={proposal.internal_note ?? ""} /></label><SubmitButton pendingLabel="Guardando…">Guardar borrador</SubmitButton></form></details>
            <form action={reviewInterventionProposal.bind(null, organizationId, proposal.id)} className="entity-proposal-review"><label>Decisión<select name="reviewStatus" required defaultValue="approved"><option value="approved">Aprobar</option><option value="dismissed">Descartar</option></select></label><label className="client-check"><input type="checkbox" name="clientVisible" /> Autorizar información para el restaurante</label><label className="wide">Resumen autorizado<textarea name="clientSummary" maxLength={2000} rows={2} placeholder="Sólo se mostrará si apruebas y marcas la autorización." /></label><SubmitButton pendingLabel="Revisando…">Guardar decisión</SubmitButton></form>
          </> : null}
          {proposal.review_status === "approved" && !proposal.linked_task_id ? <form action={linkInterventionProposal.bind(null, organizationId, proposal.id)} className="entity-proposal-link"><label>Vincular a actuación existente<select name="taskId" required defaultValue=""><option value="" disabled>Selecciona una actuación</option>{tasks.map((task) => <option value={task.id} key={task.id}>{task.title} · {task.status}</option>)}</select></label><SubmitButton pendingLabel="Vinculando…">Vincular explícitamente</SubmitButton></form> : null}
          {linkedTask ? <p className="entity-proposal-linked">Vinculada a: <b>{linkedTask.title}</b> · estado actual {linkedTask.status}. La vinculación no modificó ese estado.</p> : null}
          {proposal.client_visible && proposal.client_summary ? <p className="entity-proposal-client"><b>Visible para el restaurante:</b> {proposal.client_summary}</p> : null}
        </article>;
      })}{!proposals.length ? <p>No hay propuestas de intervención.</p> : null}</div>
    </section>

    <section className="admin-panel"><div className="admin-section-title"><div><p>Trazabilidad</p><h2>Historial de versiones</h2></div><span>{versions.length}</span></div><div className="entity-version-list">{versions.map((version) => <article key={version.id}><b>v{version.version_number}</b><span><strong>{version.commercial_name}</strong><small>{version.status === "draft" ? "Borrador editable" : version.status === "validated" ? "Oficial vigente" : "Reemplazada · conservada"}</small></span><em>{version.validated_at ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(version.validated_at)) : "Sin validar"}</em></article>)}</div></section>
  </main>;
}
