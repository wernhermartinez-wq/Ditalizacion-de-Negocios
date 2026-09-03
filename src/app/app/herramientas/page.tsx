import type { Metadata } from "next";
import { ArrowRightLeft, CircleDollarSign, Link2, Plus, ShieldAlert, Trash2, Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { addOrganizationTool, addToolIntegration, removeOrganizationTool, removeToolIntegration, updateOrganizationTool } from "./actions";

export const metadata: Metadata = { title: "Herramientas" };

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

const statusLabels: Record<string, string> = {
  planned: "Prevista",
  trial: "En prueba",
  active: "Activa",
  limited: "Uso limitado",
  retiring: "En retirada",
  retired: "Retirada",
  degraded: "Con incidencias",
  broken: "Interrumpida",
};

const criticalityLabels: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta" };

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default async function ToolsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const [catalogResult, toolsResult, integrationsResult, params] = await Promise.all([
    supabase.from("tool_catalog").select("*").eq("is_active", true).order("category").order("name"),
    supabase.from("organization_tools").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    supabase.from("tool_integrations").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    searchParams,
  ]);
  if (catalogResult.error || toolsResult.error || integrationsResult.error) throw new Error("No se pudo cargar el inventario de herramientas.");

  const catalog = catalogResult.data ?? [];
  const tools = toolsResult.data ?? [];
  const integrations = integrationsResult.data ?? [];
  const catalogById = new Map(catalog.map((tool) => [tool.id, tool]));
  const toolsById = new Map(tools.map((tool) => [tool.id, tool]));
  const toolName = (tool: (typeof tools)[number]) => tool.tool_id ? catalogById.get(tool.tool_id)?.name ?? "Herramienta del catálogo" : tool.custom_name ?? "Herramienta";
  const activeTools = tools.filter((tool) => tool.status === "active");
  const monthlyCost = tools.filter((tool) => tool.status !== "retired").reduce((sum, tool) => sum + Number(tool.monthly_cost), 0);
  const highCriticality = tools.filter((tool) => tool.criticality === "high" && tool.status !== "retired").length;
  const integrationAlerts = integrations.filter((integration) => ["degraded", "broken"].includes(integration.status)).length;

  return (
    <main className="page-content tools-page">
      <div className="page-heading tools-heading">
        <div><p className="eyebrow">Mapa operativo</p><h1>Las herramientas que sostienen tu negocio.</h1><p className="page-description">Registra uso, responsables, coste y conexiones para detectar duplicidades y puntos críticos.</p></div>
        <span className="real-data-badge"><Wrench size={16} /> {tools.length} en inventario</span>
      </div>

      <AuthMessage error={params.error} success={params.success} />

      <section className="tools-metrics" aria-label="Resumen del inventario">
        <article><Wrench size={18} /><span><small>Activas</small><strong>{activeTools.length}</strong></span></article>
        <article><CircleDollarSign size={18} /><span><small>Coste mensual</small><strong>{money(monthlyCost, "EUR")}</strong></span></article>
        <article><ShieldAlert size={18} /><span><small>Criticidad alta</small><strong>{highCriticality}</strong></span></article>
        <article className={integrationAlerts ? "attention" : ""}><Link2 size={18} /><span><small>Conexiones con alerta</small><strong>{integrationAlerts}</strong></span></article>
      </section>

      <section className="tools-layout">
        <article className="card tool-form-card">
          <header><span><Plus size={18} /></span><div><p className="eyebrow">Inventario</p><h2>Añadir herramienta</h2></div></header>
          <form action={addOrganizationTool} className="tool-form">
            <label>Catálogo<select name="toolId" defaultValue=""><option value="">Herramienta personalizada</option>{catalog.map((tool) => <option key={tool.id} value={tool.id}>{tool.name} · {tool.category}</option>)}</select></label>
            <label>Nombre personalizado<input name="customName" maxLength={100} placeholder="Ej. software del sector" /></label>
            <label>Proveedor<input name="customProvider" maxLength={100} placeholder="Opcional" /></label>
            <label>Categoría<input name="category" maxLength={80} placeholder="Solo para herramientas personalizadas" /></label>
            <label className="wide">¿Para qué se utiliza? *<textarea name="usagePurpose" required minLength={3} maxLength={500} rows={3} placeholder="Describe el trabajo que resuelve" /></label>
            <label>Área del negocio *<input name="businessArea" required minLength={2} maxLength={100} placeholder="Ej. Ventas" /></label>
            <label>Responsable<input name="ownerName" maxLength={120} placeholder="Nombre o equipo" /></label>
            <label>Personas usuarias<input name="userCount" type="number" min={1} max={1000000} /></label>
            <label>Coste mensual (€)<input name="monthlyCost" type="number" min={0} max={999999999} step="0.01" defaultValue="0" /></label>
            <label>Criticidad<select name="criticality" defaultValue="medium"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
            <label>Estado<select name="status" defaultValue="active"><option value="planned">Prevista</option><option value="trial">En prueba</option><option value="active">Activa</option><option value="limited">Uso limitado</option><option value="retiring">En retirada</option><option value="retired">Retirada</option></select></label>
            <div className="tool-form-action"><SubmitButton pendingLabel="Añadiendo…">Añadir al inventario</SubmitButton></div>
          </form>
        </article>

        <article className="card tool-inventory-card">
          <div className="card-head"><div><p className="eyebrow">Sistema actual</p><h2>Inventario de {organization.name}</h2></div><span>{tools.length}</span></div>
          {tools.length ? <div className="tool-inventory-list">{tools.map((tool) => (
            <details key={tool.id} className={`tool-record criticality-${tool.criticality}`}>
              <summary>
                <span className="tool-monogram">{toolName(tool).slice(0, 2).toUpperCase()}</span>
                <span><strong>{toolName(tool)}</strong><small>{tool.category} · {tool.business_area}</small></span>
                <span className={`tool-status status-${tool.status}`}>{statusLabels[tool.status] ?? tool.status}</span>
                <b>{money(Number(tool.monthly_cost), tool.currency)}</b>
              </summary>
              <div className="tool-record-body">
                <p>{tool.usage_purpose}</p>
                <form action={updateOrganizationTool.bind(null, tool.id)} className="tool-edit-form">
                  <label className="wide">Uso<textarea name="usagePurpose" required minLength={3} maxLength={500} rows={2} defaultValue={tool.usage_purpose} /></label>
                  <label>Área<input name="businessArea" required minLength={2} maxLength={100} defaultValue={tool.business_area} /></label>
                  <label>Responsable<input name="ownerName" maxLength={120} defaultValue={tool.owner_name ?? ""} /></label>
                  <label>Personas<input name="userCount" type="number" min={1} max={1000000} defaultValue={tool.user_count ?? ""} /></label>
                  <label>€/mes<input name="monthlyCost" type="number" min={0} max={999999999} step="0.01" defaultValue={tool.monthly_cost} /></label>
                  <label>Criticidad<select name="criticality" defaultValue={tool.criticality}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
                  <label>Estado<select name="status" defaultValue={tool.status}><option value="planned">Prevista</option><option value="trial">En prueba</option><option value="active">Activa</option><option value="limited">Uso limitado</option><option value="retiring">En retirada</option><option value="retired">Retirada</option></select></label>
                  <button type="submit" className="tool-save">Guardar cambios</button>
                </form>
                <div className="tool-record-footer"><span>{tool.user_count ? `${tool.user_count} personas` : "Usuarios sin indicar"} · Criticidad {criticalityLabels[tool.criticality]}</span><form action={removeOrganizationTool.bind(null, tool.id)}><button type="submit" className="tool-delete"><Trash2 size={14} /> Quitar</button></form></div>
              </div>
            </details>
          ))}</div> : <div className="tools-empty"><Wrench size={28} /><h3>Empieza por las herramientas imprescindibles.</h3><p>Añade correo, facturación, CRM o cualquier aplicación sin la que el negocio no pueda trabajar.</p></div>}
        </article>
      </section>

      <section className="card integrations-card">
        <div className="card-head"><div><p className="eyebrow">Flujo de información</p><h2>Conexiones entre herramientas</h2></div><span>{integrations.length}</span></div>
        {tools.length >= 2 && <form action={addToolIntegration} className="integration-form">
          <label>Desde<select name="sourceToolId" required defaultValue=""><option value="" disabled>Selecciona</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{toolName(tool)}</option>)}</select></label>
          <ArrowRightLeft size={18} />
          <label>Hacia<select name="targetToolId" required defaultValue=""><option value="" disabled>Selecciona</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{toolName(tool)}</option>)}</select></label>
          <label>Método<input name="method" required minLength={2} maxLength={120} placeholder="API, Zapier, CSV…" /></label>
          <label>Estado<select name="status" defaultValue="active"><option value="planned">Prevista</option><option value="active">Activa</option><option value="degraded">Con incidencias</option><option value="broken">Interrumpida</option><option value="retired">Retirada</option></select></label>
          <SubmitButton pendingLabel="Guardando…">Registrar conexión</SubmitButton>
        </form>}
        {integrations.length ? <div className="integration-list">{integrations.map((integration) => {
          const source = toolsById.get(integration.source_tool_id);
          const target = toolsById.get(integration.target_tool_id);
          return <article key={integration.id} className={`integration-row status-${integration.status}`}><span><strong>{source ? toolName(source) : "Herramienta retirada"}</strong><small>{integration.method}</small></span><ArrowRightLeft size={17} /><span><strong>{target ? toolName(target) : "Herramienta retirada"}</strong><small>{statusLabels[integration.status] ?? integration.status}</small></span><form action={removeToolIntegration.bind(null, integration.id)}><button type="submit" aria-label="Quitar integración"><Trash2 size={15} /></button></form></article>;
        })}</div> : <div className="integration-empty"><Link2 size={22} /><span><strong>No hay conexiones registradas.</strong><small>{tools.length < 2 ? "Añade al menos dos herramientas para dibujar el flujo." : "Registra cómo viajan los datos entre aplicaciones."}</small></span></div>}
      </section>
    </main>
  );
}
