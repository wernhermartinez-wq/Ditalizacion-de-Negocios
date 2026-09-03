import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Bot, Check, CheckCircle2, CircleDot, ExternalLink, FileText, Gauge, Globe2, ListChecks, SearchCheck, Sparkles } from "lucide-react";
import { AuthMessage } from "@/components/auth/message";
import { PrintReportButton } from "@/components/app/print-report-button";
import { getCurrentOrganization } from "@/lib/organizations";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { metricLabel } from "@/lib/visibility/metrics";
import { providerConfiguration } from "@/lib/visibility/providers";
import type { VisibilityMetrics } from "@/lib/visibility/types";
import { visibilityLimits } from "@/lib/visibility/config";
import { approveVisibilityPrompt } from "./actions";

export const metadata: Metadata = { title: "Visibilidad SEO e IA" };
const tabs = [
  ["resumen", "Resumen"], ["preguntas", "Preguntas"], ["modelos", "Modelos de IA"], ["competencia", "Competidores"],
  ["fuentes", "Fuentes y citas"], ["percepcion", "Percepción de marca"], ["seo", "SEO / Search Console"],
  ["recomendaciones", "Recomendaciones"], ["tareas", "Tareas Nexaro"], ["informe", "Informes"],
] as const;
type Tab = (typeof tabs)[number][0];

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
function metricsFrom(value: Json): VisibilityMetrics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as unknown as VisibilityMetrics;
}
function providerName(value: string) { return ({ openai: "OpenAI", gemini: "Gemini", perplexity: "Perplexity" } as Record<string, string>)[value] ?? value; }
function statusText(value: string) { return ({ completed: "Completada", pending: "Pendiente", in_progress: "En curso", partial: "Parcial", failed: "Con error", not_configured: "No configurada", suggested: "Pendiente de aprobación", approved: "Aprobada", task_created: "Tarea creada", open: "Abierta", positive: "Positivo", neutral: "Neutro", negative: "Negativo" } as Record<string, string>)[value] ?? value; }

export default async function VisibilityPage({ searchParams }: { searchParams: Promise<{ tab?: string; provider?: string; model?: string; country?: string; language?: string; prompt?: string; from?: string; to?: string; metric?: string; error?: string; success?: string }> }) {
  const [supabase, params] = await Promise.all([createClient(), searchParams]);
  const { data: claims } = await supabase.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");
  const tab = tabs.some(([key]) => key === params.tab) ? params.tab as Tab : "resumen";
  const projectResult = await supabase.from("visibility_projects").select("*").eq("organization_id", organization.id).maybeSingle();
  if (projectResult.error) throw new Error("No se pudo cargar el módulo de visibilidad.");
  const project = projectResult.data;

  const empty = !project;
  const [prompts, competitors, runs, responses, mentions, citations, snapshots, recommendations, usage, reports, tasks] = project ? await Promise.all([
    supabase.from("visibility_prompts").select("*").eq("project_id", project.id).order("created_at"),
    supabase.from("visibility_competitors").select("*").eq("project_id", project.id).eq("active", true),
    supabase.from("visibility_runs").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("visibility_responses").select("*, visibility_prompts(question)").in("run_id", (await supabase.from("visibility_runs").select("id").eq("project_id", project.id)).data?.map((run) => run.id) ?? []).order("created_at", { ascending: false }),
    supabase.from("visibility_mentions").select("*, visibility_responses!inner(run_id, visibility_runs!inner(project_id))").eq("visibility_responses.visibility_runs.project_id", project.id),
    supabase.from("visibility_citations").select("*, visibility_responses!inner(provider, run_id, visibility_runs!inner(project_id))").eq("visibility_responses.visibility_runs.project_id", project.id).order("created_at", { ascending: false }),
    supabase.from("visibility_metric_snapshots").select("*").eq("project_id", project.id).order("generated_at", { ascending: false }).limit(30),
    supabase.from("visibility_recommendations").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
    supabase.from("visibility_usage_events").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(200),
    supabase.from("visibility_reports").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
    supabase.from("nexaro_tasks").select("*").eq("organization_id", organization.id).eq("source", "visibility").order("created_at", { ascending: false }),
  ]) : Array.from({ length: 11 }, () => ({ data: [], error: null }));
  const resultError = [prompts, competitors, runs, responses, mentions, citations, snapshots, recommendations, usage, reports, tasks].find((result) => result.error)?.error;
  if (resultError) throw new Error("No se pudieron cargar todos los datos de visibilidad.");
  const latestSnapshot = snapshots.data?.[0];
  const metrics = latestSnapshot ? metricsFrom(latestSnapshot.metrics) : null;
  const metricEvidence = metrics && params.metric && params.metric in metrics ? metrics[params.metric as keyof VisibilityMetrics].responseIds : null;
  const allResponses = (responses.data ?? []).filter((response) => {
    const question = response.visibility_prompts;
    const created = new Date(response.created_at).getTime();
    return (!params.provider || response.provider === params.provider)
      && (!params.model || response.model === params.model)
      && (!params.country || response.country === params.country)
      && (!params.language || response.language === params.language)
      && (!params.prompt || response.prompt_id === params.prompt)
      && (!params.from || created >= new Date(`${params.from}T00:00:00`).getTime())
      && (!params.to || created <= new Date(`${params.to}T23:59:59`).getTime())
      && (!metricEvidence || metricEvidence.includes(response.id))
      && Boolean(question);
  });
  const providers = providerConfiguration();
  const limits = visibilityLimits(project?.settings);

  return (
    <main className={`page-content visibility-page ${tab === "informe" ? "visibility-print" : ""}`}>
      <header className="visibility-hero">
        <div><p className="eyebrow">Nexaro · Inteligencia de mercado</p><h1>Visibilidad SEO e IA</h1><p>Comprueba cuándo aparece tu empresa, quién la recomienda y qué fuentes usan los asistentes con IA.</p></div>
        <div className="visibility-hero-state"><SearchCheck size={19} /><span><small>Última medición</small><strong>{formatDate(runs.data?.[0]?.completed_at ?? null)}</strong></span></div>
      </header>
      <p className="visibility-disclaimer"><AlertTriangle size={14} /> Medición realizada mediante APIs oficiales y búsquedas fundamentadas. No reproduce exactamente las respuestas personalizadas de las aplicaciones públicas.</p>
      <AuthMessage error={params.error} success={params.success} />
      <nav className="visibility-tabs no-print" aria-label="Secciones de visibilidad">{tabs.map(([key, label]) => <Link key={key} className={tab === key ? "active" : ""} href={`/app/visibilidad?tab=${key}`}>{label}</Link>)}</nav>

      {empty ? <section className="visibility-empty card"><span><Globe2 size={26} /></span><p className="eyebrow">Módulo sin configurar</p><h2>Nexaro preparará primero tu proyecto de visibilidad.</h2><p>Definirá marca, dominio, servicios, competidores y preguntas. Tú aprobarás las preguntas antes de realizar cualquier consulta.</p></section> : <>
        {tab === "resumen" && <>
          <section className="visibility-provider-strip">{providers.map((item) => <article key={item.provider} className={item.configured ? "ready" : "missing"}><Bot size={17} /><span><strong>{providerName(item.provider)}</strong><small>{item.configured ? "Configurada" : "No configurada"}</small></span></article>)}</section>
          {metrics ? <section className="visibility-metrics">{Object.entries(metrics).map(([key, metric]) => <Link href={`/app/visibilidad?tab=preguntas&metric=${key}`} className="visibility-metric" key={key}><span>{metricLabel(key as keyof VisibilityMetrics)}</span><strong>{metric.value}<small>%</small></strong><div><i style={{ width: `${Math.min(metric.value, 100)}%` }} /></div><small>{metric.numerator} de {metric.denominator} · Ver respuestas de origen</small></Link>)}</section> : <section className="visibility-empty card compact"><Gauge size={25} /><h2>Aún no hay métricas.</h2><p>Se calcularán cuando Nexaro ejecute las preguntas aprobadas.</p></section>}
          <section className="visibility-grid"><article className="card visibility-panel"><header><div><p className="eyebrow">Preguntas</p><h2>Validación pendiente</h2></div><span>{prompts.data?.filter((item) => item.status === "suggested").length ?? 0}</span></header><p>Las consultas propuestas por Nexaro necesitan tu aprobación antes de ejecutarse.</p><Link href="/app/visibilidad?tab=preguntas">Revisar preguntas <ArrowRight size={15} /></Link></article><article className="card visibility-panel"><header><div><p className="eyebrow">Seguimiento</p><h2>Últimas ejecuciones</h2></div><span>{runs.data?.length ?? 0}</span></header>{runs.data?.slice(0, 3).map((run) => <div className="visibility-run" key={run.id}><CircleDot size={14} /><span><strong>{statusText(run.status)}</strong><small>{formatDate(run.created_at)} · {run.requested_providers.length} proveedores</small></span></div>)}</article></section>
          <section className="card visibility-table-panel"><header><div><p className="eyebrow">Evolución</p><h2>Presencia a lo largo del tiempo</h2></div><span>{snapshots.data?.length ?? 0} mediciones</span></header>{snapshots.data?.length ? <div className="visibility-history">{[...(snapshots.data ?? [])].reverse().map((snapshot) => { const item = metricsFrom(snapshot.metrics); return <article key={snapshot.id}><small>{formatDate(snapshot.generated_at)}</small><div><i style={{ height: `${Math.max(item?.presence.value ?? 0, 3)}%` }} /></div><strong>{item?.presence.value ?? 0}%</strong></article>; })}</div> : <div className="visibility-empty compact"><Gauge size={24} /><h2>La evolución necesita al menos una medición.</h2></div>}</section>
        </>}

        {tab === "preguntas" && <>
          <section className="card visibility-table-panel"><header><div><p className="eyebrow">Aprobación</p><h2>Preguntas monitorizadas</h2></div><span>{prompts.data?.length ?? 0}/{limits.maxActivePrompts}</span></header><div className="visibility-prompt-list">{prompts.data?.map((prompt) => <article key={prompt.id}><div><strong>{prompt.question}</strong><small>{prompt.country} · {prompt.language.toUpperCase()} · {statusText(prompt.status)}</small></div>{prompt.status === "suggested" && <form action={approveVisibilityPrompt.bind(null, prompt.id)}><button type="submit"><Check size={14} /> Aprobar</button></form>}</article>)}</div></section>
          <section className="card visibility-table-panel"><header><div><p className="eyebrow">Evidencia primaria</p><h2>Respuestas originales</h2></div><span>{allResponses.length} resultados</span></header>
            <form className="visibility-filter-form no-print" method="get"><input type="hidden" name="tab" value="preguntas" /><select name="provider" defaultValue={params.provider ?? ""}><option value="">Todos los proveedores</option>{providers.map((item) => <option value={item.provider} key={item.provider}>{providerName(item.provider)}</option>)}</select><select name="model" defaultValue={params.model ?? ""}><option value="">Todos los modelos</option>{[...new Set((responses.data ?? []).map((item) => item.model).filter(Boolean))].map((model) => <option value={model ?? ""} key={model}>{model}</option>)}</select><select name="country" defaultValue={params.country ?? ""}><option value="">Todos los países</option>{[...new Set((responses.data ?? []).map((item) => item.country))].map((country) => <option value={country} key={country}>{country}</option>)}</select><select name="language" defaultValue={params.language ?? ""}><option value="">Todos los idiomas</option><option value="es">Español</option><option value="de">Alemán</option></select><select name="prompt" defaultValue={params.prompt ?? ""}><option value="">Todas las preguntas</option>{prompts.data?.map((prompt) => <option value={prompt.id} key={prompt.id}>{prompt.question}</option>)}</select><label>Desde<input type="date" name="from" defaultValue={params.from ?? ""} /></label><label>Hasta<input type="date" name="to" defaultValue={params.to ?? ""} /></label><button type="submit">Aplicar filtros</button><Link href="/app/visibilidad?tab=preguntas">Limpiar</Link></form>
            {params.metric && <p className="visibility-filter-note">Mostrando las respuestas que originan la métrica «{metricLabel(params.metric as keyof VisibilityMetrics)}».</p>}
            {allResponses.length ? <div className="visibility-response-list">{allResponses.map((response) => <details key={response.id}><summary><span><b>{providerName(response.provider)}</b><strong>{response.visibility_prompts?.question ?? "Pregunta"}</strong><small>{formatDate(response.created_at)} · {response.model ?? "Sin modelo"} · {statusText(response.status)}</small></span><ArrowRight size={16} /></summary><div><p>{response.original_response ?? response.error_message ?? "El proveedor no devolvió contenido."}</p>{response.needs_review && <em><AlertTriangle size={14} /> Revisión humana recomendada</em>}</div></details>)}</div> : <div className="visibility-empty compact"><Bot size={24} /><h2>No hay respuestas con este filtro.</h2><p>Prueba otros filtros o espera la primera ejecución.</p></div>}
          </section>
        </>}

        {tab === "fuentes" && <section className="card visibility-table-panel"><header><div><p className="eyebrow">Fuentes</p><h2>Dominios citados</h2></div><span>{citations.data?.length ?? 0} citas</span></header>{citations.data?.length ? <div className="visibility-citation-list">{citations.data.map((citation) => <a key={citation.id} href={citation.url} target="_blank" rel="noreferrer"><span><Globe2 size={16} /></span><div><strong>{citation.title ?? citation.domain}</strong><small>{citation.domain} · {providerName(citation.visibility_responses.provider)}{citation.is_client_domain ? " · Dominio propio" : ""}</small></div><ExternalLink size={14} /></a>)}</div> : <div className="visibility-empty compact"><Globe2 size={24} /><h2>Aún no hay fuentes registradas.</h2><p>Las citas aparecerán junto a la respuesta exacta que las utilizó.</p></div>}</section>}

        {tab === "competencia" && <section className="visibility-grid"><article className="card visibility-panel"><header><div><p className="eyebrow">Comparación</p><h2>Competidores monitorizados</h2></div><span>{competitors.data?.length ?? 0}/{limits.maxCompetitors}</span></header>{competitors.data?.map((item) => <div className="visibility-competitor" key={item.id}><span>{item.name.slice(0, 2).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.domain}</small></div></div>)}</article><article className="card visibility-panel"><header><div><p className="eyebrow">Menciones</p><h2>Cuota observada</h2></div></header>{mentions.data?.length ? Object.entries(Object.groupBy(mentions.data, (item) => item.entity_name)).map(([name, items]) => <div className="visibility-bar" key={name}><span>{name}</span><div><i style={{ width: `${Math.round(((items?.length ?? 0) / mentions.data.length) * 100)}%` }} /></div><b>{items?.length ?? 0}</b></div>) : <p className="visibility-muted">Se mostrará al comparar respuestas reales.</p>}</article></section>}

        {tab === "modelos" && <><section className="visibility-provider-strip">{providers.map((item) => <article key={item.provider} className={item.configured ? "ready" : "missing"}><Bot size={17} /><span><strong>{providerName(item.provider)}</strong><small>{item.configured ? "Configurada" : "No configurada"}</small></span></article>)}</section><section className="visibility-grid"><article className="card visibility-panel"><header><div><p className="eyebrow">Ejecuciones</p><h2>Historial por proveedor</h2></div><span>{runs.data?.length ?? 0}</span></header>{runs.data?.map((run) => <div className="visibility-run" key={run.id}><CircleDot size={14} /><span><strong>{statusText(run.status)}</strong><small>{formatDate(run.created_at)} · {run.requested_providers.map(providerName).join(", ")}</small></span></div>)}</article><article className="card visibility-panel"><header><div><p className="eyebrow">Consumo</p><h2>Solicitudes registradas</h2></div><span>{usage.data?.length ?? 0}</span></header><div className="visibility-usage">{providers.map((provider) => { const events = usage.data?.filter((item) => item.provider === provider.provider) ?? []; return <article key={provider.provider}><Bot size={18} /><div><strong>{providerName(provider.provider)}</strong><small>{events.reduce((sum, item) => sum + item.quantity, 0)} consultas · {events.reduce((sum, item) => sum + (item.input_tokens ?? 0) + (item.output_tokens ?? 0), 0)} tokens</small></div></article>; })}</div></article></section></>}

        {tab === "recomendaciones" && <section className="card visibility-table-panel"><header><div><p className="eyebrow">Decisiones</p><h2>Recomendaciones trazables</h2></div><span>{recommendations.data?.length ?? 0}</span></header>{recommendations.data?.length ? <div className="visibility-recommendations">{recommendations.data.map((item) => <article key={item.id}><span className={`priority ${item.priority}`}>{item.priority}</span><div><h3>{item.title}</h3><p>{item.reason}</p><small><b>Evidencia:</b> {item.evidence}</small><small><b>Impacto:</b> {item.impact}</small></div><span className="status">{statusText(item.status)}</span></article>)}</div> : <div className="visibility-empty compact"><Sparkles size={24} /><h2>Aún no hay recomendaciones.</h2><p>Solo se crearán a partir de resultados medidos.</p></div>}</section>}

        {tab === "percepcion" && <div className="visibility-grid"><section className="card visibility-panel"><header><div><p className="eyebrow">Marca</p><h2>Señales monitorizadas</h2></div></header><dl className="visibility-config"><div><dt>Nombre</dt><dd>{project.brand_name}</dd></div><div><dt>Variantes</dt><dd>{project.brand_variants.join(", ") || "Ninguna"}</dd></div><div><dt>Descripción</dt><dd>{project.business_description || "Sin descripción"}</dd></div><div><dt>Público</dt><dd>{project.target_audience || "Sin definir"}</dd></div></dl></section><section className="card visibility-panel"><header><div><p className="eyebrow">Percepción observada</p><h2>Menciones y sentimiento</h2></div><span>{mentions.data?.length ?? 0}</span></header>{mentions.data?.length ? mentions.data.map((mention) => <div className="visibility-run" key={mention.id}><CircleDot size={14} /><span><strong>{mention.entity_name} · {statusText(mention.sentiment)}</strong><small>{mention.attributes.join(", ") || "Sin atributos"}{mention.needs_review ? " · Requiere revisión" : ""}</small></span></div>) : <p className="visibility-muted">Aparecerá cuando existan menciones reales de la marca.</p>}</section></div>}

        {tab === "seo" && <section className="card visibility-table-panel"><header><div><p className="eyebrow">SEO tradicional</p><h2>Google Search Console</h2></div><span>{project.gsc_status === "connected" ? "Conectada" : "No configurada"}</span></header><div className="visibility-empty compact"><Globe2 size={24} /><h2>{project.gsc_status === "connected" ? "Propiedad conectada" : "Conexión pendiente de credenciales OAuth"}</h2><p>{project.gsc_status === "connected" ? `Propiedad: ${project.gsc_property_url ?? project.domain}` : "Nexaro debe completar la autorización de Google antes de importar consultas, páginas, clics, impresiones, CTR y posición."}</p><p>Search Console no separa todas las apariciones en AI Overviews; sus datos no se presentarán como si lo hiciera.</p></div></section>}

        {tab === "tareas" && <section className="card visibility-table-panel"><header><div><p className="eyebrow">Ejecución Nexaro</p><h2>Tareas creadas desde recomendaciones</h2></div><span>{tasks.data?.length ?? 0}</span></header>{tasks.data?.length ? <div className="completed-task-list">{tasks.data.map((task) => <article className="completed-task" key={task.id}><span className="completed-task-icon">{task.status === "completed" ? <CheckCircle2 size={18} /> : <ListChecks size={18} />}</span><div><strong>{task.title}</strong><small>{statusText(task.status)} · Prioridad {task.priority}{task.completed_at ? ` · ${formatDate(task.completed_at)}` : ""}</small>{task.description && <p>{task.description}</p>}</div></article>)}</div> : <div className="visibility-empty compact"><ListChecks size={24} /><h2>Aún no hay tareas de visibilidad.</h2><p>Solo Nexaro puede convertir una recomendación en tarea y marcarla como comprobada.</p></div>}</section>}

        {tab === "informe" && <>
          <form className="visibility-report-period no-print" method="get"><input type="hidden" name="tab" value="informe" /><label>Desde<input type="date" name="from" defaultValue={params.from ?? ""} /></label><label>Hasta<input type="date" name="to" defaultValue={params.to ?? ""} /></label><button type="submit">Preparar periodo</button></form>
          <section className="card visibility-report"><header><div><p className="eyebrow">Informe de visibilidad</p><h2>{organization.name}</h2><span>{params.from || params.to ? `Periodo ${params.from || "inicio"} — ${params.to || "actualidad"}` : `Generado el ${formatDate(new Date().toISOString())}`}</span></div><PrintReportButton /></header>{metrics ? <><div className="visibility-report-metrics">{Object.entries(metrics).map(([key, metric]) => <article key={key}><span>{metricLabel(key as keyof VisibilityMetrics)}</span><strong>{metric.value}%</strong><small>{metric.numerator} / {metric.denominator}</small></article>)}</div><div className="visibility-report-copy">
            <h3>Resumen ejecutivo</h3><p>Resultados observados mediante APIs oficiales y búsquedas fundamentadas. Cada indicador se puede comprobar en Preguntas y Fuentes y citas.</p>
            <h3>Evolución</h3><p>{snapshots.data && snapshots.data.length > 1 ? `La presencia pasó de ${metricsFrom(snapshots.data[1].metrics)?.presence.value ?? 0}% a ${metrics.presence.value}% en las dos últimas mediciones.` : "Se necesita una segunda medición para calcular la variación."}</p>
            <h3>Comparación competitiva</h3><p>{competitors.data?.length ? `Competidores monitorizados: ${competitors.data.map((item) => item.name).join(", ")}.` : "No hay competidores configurados."}</p>
            <h3>Fuentes principales</h3><p>{citations.data?.length ? [...new Set(citations.data.slice(0, 8).map((item) => item.domain))].join(", ") : "Todavía no hay fuentes citadas."}</p>
            <h3>Percepción de marca</h3><p>{mentions.data?.length ? `${mentions.data.filter((item) => item.entity_type === "client").length} menciones de la marca analizadas; ${mentions.data.filter((item) => item.entity_type === "client" && item.sentiment === "positive").length} positivas.` : "Todavía no hay menciones analizadas."}</p>
            <h3>Recomendaciones abiertas</h3>{recommendations.data?.filter((item) => item.status === "open").map((item) => <p key={item.id}><strong>{item.title}.</strong> {item.impact}</p>)}
            <h3>Trabajo y próximas acciones</h3>{tasks.data?.length ? tasks.data.map((task) => <p key={task.id}><strong>{task.status === "completed" ? "Realizada" : "Próxima"}: {task.title}.</strong> {task.completed_at ? formatDate(task.completed_at) : `Prioridad ${task.priority}`}</p>) : <p>No hay tareas de visibilidad registradas.</p>}
          </div></> : <div className="visibility-empty compact"><FileText size={24} /><h2>No se puede generar el informe sin una medición.</h2></div>}<footer>Informe orientativo de Nexaro. Proveedores consultados: {providers.filter((item) => item.configured).map((item) => providerName(item.provider)).join(", ") || "ninguno configurado"}.</footer></section>
        </>}
      </>}
    </main>
  );
}
