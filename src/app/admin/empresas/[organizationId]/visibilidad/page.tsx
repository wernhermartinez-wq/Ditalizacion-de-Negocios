import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, CircleAlert, Globe2, Play, Plus, SearchCheck, Settings2 } from "lucide-react";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { metricLabel } from "@/lib/visibility/metrics";
import { providerConfiguration } from "@/lib/visibility/providers";
import type { VisibilityMetrics } from "@/lib/visibility/types";
import { visibilityLimits } from "@/lib/visibility/config";
import { addVisibilityCompetitor, addVisibilityPrompt, convertRecommendationToTask, runVisibilityNow, runVisibilityPrompt, saveVisibilityProject, updateVisibilityPrompt } from "./actions";

export const metadata: Metadata = { title: "Visibilidad · Control Nexaro" };
const values = (items: string[]) => items.join(", ");
const metricsFrom = (value: Json): VisibilityMetrics | null => value && typeof value === "object" && !Array.isArray(value) ? value as unknown as VisibilityMetrics : null;
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "Nunca";

export default async function AdminVisibilityPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { organizationId } = await params;
  const [supabase, messages] = await Promise.all([createClient(), searchParams]);
  const organizationResult = await supabase.from("organizations").select("*").eq("id", organizationId).maybeSingle();
  if (!organizationResult.data || organizationResult.error) notFound();
  const organization = organizationResult.data;
  const projectResult = await supabase.from("visibility_projects").select("*").eq("organization_id", organizationId).maybeSingle();
  if (projectResult.error) throw new Error("No se pudo cargar la configuración de visibilidad.");
  const project = projectResult.data;
  const [promptsResult, competitorsResult, runsResult, metricsResult, recommendationsResult] = project ? await Promise.all([
    supabase.from("visibility_prompts").select("*").eq("project_id", project.id).order("created_at"),
    supabase.from("visibility_competitors").select("*").eq("project_id", project.id).order("created_at"),
    supabase.from("visibility_runs").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("visibility_metric_snapshots").select("*").eq("project_id", project.id).order("generated_at", { ascending: false }).limit(1),
    supabase.from("visibility_recommendations").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
  ]) : Array.from({ length: 5 }, () => ({ data: [], error: null }));
  const latestMetrics = metricsResult.data?.[0] ? metricsFrom(metricsResult.data[0].metrics) : null;
  const providers = providerConfiguration();
  const limits = visibilityLimits(project?.settings);

  return <main className="admin-page admin-visibility-page">
    <Link className="admin-back" href={`/admin/empresas/${organizationId}`}><ArrowLeft size={16} /> Volver al expediente</Link>
    <header className="admin-company-hero admin-visibility-hero"><div className="admin-company-hero-mark"><SearchCheck size={22} /></div><div><p>SEO e inteligencia artificial</p><h1>{organization.name}</h1><span>Control de presencia, citas, competencia y oportunidades verificables.</span></div><div className={`admin-diagnostic-state ${project?.status === "active" ? "complete" : "pending"}`}><small>Estado</small><strong>{project?.status === "active" ? "Activo" : "Sin configurar"}</strong></div></header>
    <AuthMessage error={messages.error} success={messages.success} />
    <section className="admin-provider-status">{providers.map((provider) => <article key={provider.provider} className={provider.configured ? "ready" : "missing"}><Bot size={18} /><span><strong>{provider.provider === "openai" ? "OpenAI" : provider.provider === "gemini" ? "Gemini" : "Perplexity"}</strong><small>{provider.configured ? "Configurada" : "No configurada"}</small></span>{provider.configured ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}</article>)}</section>

    <div className="admin-company-columns">
      <div className="admin-company-primary">
        <section className="admin-panel"><div className="admin-section-title"><div><p>Base de medición</p><h2>Configuración del proyecto</h2></div><Settings2 size={18} /></div>
          <form action={saveVisibilityProject.bind(null, organizationId)} className="admin-work-form admin-visibility-form">
            <div className="field"><label htmlFor="brandName">Marca *</label><input id="brandName" name="brandName" required defaultValue={project?.brand_name ?? organization.name} /></div>
            <div className="field"><label htmlFor="domain">Dominio *</label><input id="domain" name="domain" required placeholder="empresa.es" defaultValue={project?.domain ?? organization.website?.replace(/^https?:\/\//, "") ?? ""} /></div>
            <div className="field field-wide"><label htmlFor="brandVariants">Variantes de la marca</label><input id="brandVariants" name="brandVariants" defaultValue={values(project?.brand_variants ?? [])} placeholder="Nombre comercial, abreviatura" /></div>
            <div className="field field-wide"><label htmlFor="services">Servicios principales</label><input id="services" name="services" defaultValue={values(project?.services ?? [])} placeholder="SEO, página web, automatización" /></div>
            <div className="field field-wide"><label htmlFor="description">Qué hace la empresa</label><textarea id="description" name="description" rows={3} defaultValue={project?.business_description ?? ""} /></div>
            <div className="field field-wide"><label htmlFor="audience">Cliente objetivo</label><textarea id="audience" name="audience" rows={2} defaultValue={project?.target_audience ?? ""} /></div>
            <div className="field"><label htmlFor="country">País (ISO)</label><input id="country" name="country" maxLength={2} defaultValue={project?.country ?? "ES"} /></div>
            <div className="field"><label htmlFor="region">Ciudad o región</label><input id="region" name="region" defaultValue={project?.region ?? organization.city ?? ""} /></div>
            <div className="field"><label htmlFor="language">Idioma principal</label><select id="language" name="language" defaultValue={project?.primary_language ?? "es"}><option value="es">Español</option><option value="de">Alemán</option></select></div>
            <div className="field"><label htmlFor="secondaryLanguages">Idiomas secundarios</label><input id="secondaryLanguages" name="secondaryLanguages" defaultValue={values(project?.secondary_languages ?? [])} placeholder="de" /></div>
            <div className="field"><label htmlFor="frequency">Frecuencia</label><select id="frequency" name="frequency" defaultValue={project?.schedule_frequency ?? "weekly"}><option value="weekly">Semanal</option><option value="manual">Manual</option></select></div>
            <div className="field"><label htmlFor="maxCompetitors">Máximo de competidores</label><input id="maxCompetitors" name="maxCompetitors" type="number" min="1" max="10" defaultValue={limits.maxCompetitors} /></div>
            <div className="field"><label htmlFor="maxPrompts">Máximo de preguntas activas</label><input id="maxPrompts" name="maxPrompts" type="number" min="1" max="100" defaultValue={limits.maxActivePrompts} /></div>
            <div className="field field-wide"><label htmlFor="objectives">Objetivos</label><input id="objectives" name="objectives" defaultValue={values(project?.objectives ?? [])} placeholder="Más menciones, más citas del dominio" /></div>
            <div className="admin-work-form-footer"><span>Un dominio · ES/DE · ejecución manual o semanal.</span><SubmitButton pendingLabel="Guardando…">Guardar configuración</SubmitButton></div>
          </form>
        </section>

        {project && <>
          <section className="admin-panel"><div className="admin-section-title"><div><p>Preguntas</p><h2>Consultas para aprobación</h2></div><span>{promptsResult.data?.length ?? 0}/{limits.maxActivePrompts}</span></div><form action={addVisibilityPrompt.bind(null, organizationId, project.id)} className="admin-inline-form"><textarea name="question" required minLength={10} maxLength={800} placeholder="Ej. ¿Qué consultoras ayudan a una pyme de Valencia a conseguir más clientes por internet?" /><input name="country" defaultValue={project.country} maxLength={2} aria-label="País" /><select name="language" defaultValue={project.primary_language}><option value="es">ES</option><option value="de">DE</option></select><button type="submit"><Plus size={15} /> Proponer</button></form><div className="admin-visibility-list">{promptsResult.data?.map((prompt) => <article key={prompt.id}><div><strong>{prompt.question}</strong><small>{prompt.country} · {prompt.language.toUpperCase()}</small></div>{prompt.status === "approved" ? <form action={runVisibilityPrompt.bind(null, organizationId, project.id, prompt.id)}><button type="submit"><Play size={13} /> Ejecutar pregunta</button></form> : <span className={prompt.status}>{prompt.status === "suggested" ? "Espera al cliente" : "Inactiva"}</span>}</article>)}</div></section>
          <section className="admin-panel"><div className="admin-section-title"><div><p>Resultados</p><h2>Medición y recomendaciones</h2></div>{(promptsResult.data?.some((item) => item.status === "approved")) && <form action={runVisibilityNow.bind(null, organizationId, project.id)}><button className="admin-run-button" type="submit"><Play size={15} /> Ejecutar ahora</button></form>}</div>
            {latestMetrics ? <div className="admin-visibility-metrics">{Object.entries(latestMetrics).map(([key, metric]) => <article key={key}><span>{metricLabel(key as keyof VisibilityMetrics)}</span><strong>{metric.value}%</strong><small>{metric.numerator}/{metric.denominator}</small></article>)}</div> : <div className="admin-empty compact"><SearchCheck size={22} /><strong>Aún no hay una medición.</strong><span>Aprueba al menos una pregunta desde el área cliente y ejecuta el análisis.</span></div>}
            <div className="admin-visibility-list recommendations">{recommendationsResult.data?.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.evidence}</small></div>{item.nexaro_task_id ? <span className="approved">Tarea creada</span> : <form action={convertRecommendationToTask.bind(null, organizationId, item.id)}><button type="submit">Crear tarea Nexaro</button></form>}</article>)}</div>
          </section>
        </>}
      </div>

      <aside className="admin-company-secondary">{project ? <>
        <section className="admin-panel"><div className="admin-section-title"><div><p>Edición</p><h2>Gestionar preguntas</h2></div><span>{promptsResult.data?.length ?? 0}</span></div><div className="admin-prompt-editor-list">{promptsResult.data?.map((prompt) => <details key={prompt.id}><summary>{prompt.question}<span>{prompt.active ? "Activa" : "Inactiva"}</span></summary><form action={updateVisibilityPrompt.bind(null, organizationId, project.id, prompt.id)}><textarea name="question" defaultValue={prompt.question} required minLength={10} maxLength={800} /><div><input name="country" defaultValue={prompt.country} maxLength={2} aria-label="País" /><select name="language" defaultValue={prompt.language}><option value="es">ES</option><option value="de">DE</option></select><label><input type="checkbox" name="active" defaultChecked={prompt.active} /> Monitorizar</label></div><button type="submit">Guardar y pedir aprobación</button></form></details>)}</div></section>
        <section className="admin-panel"><div className="admin-section-title"><div><p>Comparación</p><h2>Competidores</h2></div><span>{competitorsResult.data?.filter((item) => item.active).length ?? 0}/{limits.maxCompetitors}</span></div><form action={addVisibilityCompetitor.bind(null, organizationId, project.id)} className="admin-stack-form"><input name="name" required placeholder="Nombre" /><input name="domain" required placeholder="competidor.es" /><input name="variants" placeholder="Variantes separadas por comas" /><button type="submit"><Plus size={15} /> Añadir competidor</button></form><div className="admin-visibility-list compact">{competitorsResult.data?.map((item) => <article key={item.id}><Globe2 size={15} /><div><strong>{item.name}</strong><small>{item.domain}</small></div></article>)}</div></section>
        <section className="admin-panel"><div className="admin-section-title"><div><p>Ejecuciones</p><h2>Historial</h2></div><span>{runsResult.data?.length ?? 0}</span></div><div className="admin-visibility-list compact">{runsResult.data?.map((run) => <article key={run.id}><div><strong>{run.status === "completed" ? "Completada" : run.status === "partial" ? "Parcial" : "Con error"}</strong><small>{dateTime(run.completed_at ?? run.created_at)} · {run.requested_providers.length} proveedores</small></div></article>)}</div></section>
        <section className="admin-panel admin-gsc-state"><div className="admin-section-title"><div><p>Google</p><h2>Search Console</h2></div></div><p>{process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID ? "Credenciales preparadas. Falta autorizar la propiedad." : "No configurada. Añade las credenciales OAuth en Vercel para activar la conexión."}</p><small>La integración solicita únicamente el alcance de lectura.</small></section>
      </> : <section className="admin-panel"><div className="admin-empty compact"><Settings2 size={22} /><strong>Guarda primero el proyecto.</strong><span>Después podrás añadir preguntas y competidores.</span></div></section>}</aside>
    </div>
  </main>;
}
