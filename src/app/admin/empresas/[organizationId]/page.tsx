import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Circle, CircleDot, ClipboardList, Globe2, KeyRound, Mail, RotateCcw, ScanSearch, UserRound } from "lucide-react";
import { AuthMessage } from "@/components/auth/message";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { RoadmapSelectionForm } from "@/components/admin/roadmap-selection-form";
import { isRestaurantRoadmapTask, mergeRestaurantRoadmapTasks, restaurantRoadmapStages, restaurantStatusLabels } from "@/lib/restaurant-roadmap";
import { createClient } from "@/lib/supabase/server";
import { workCategories, workCategoryLabel } from "@/lib/work";
import { addWorkEntry, assignRestaurantRoadmapSteps, completeNexaroTask, reopenNexaroTask, resetMemberPassword, updateRestaurantRoadmapStep, updateWorkEntry } from "./actions";

export const metadata: Metadata = { title: "Empresa · Control Nexaro" };

type PageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function AdminCompanyPage({ params, searchParams }: PageProps) {
  const { organizationId } = await params;
  const [supabase, messages] = await Promise.all([createClient(), searchParams]);
  const { data: organization, error: organizationError } = await supabase.from("organizations").select("*").eq("id", organizationId).maybeSingle();
  if (organizationError || !organization) notFound();

  const [membershipsResult, usersResult, profilesResult, workResult, nexaroTasksResult] = await Promise.all([
    supabase.from("organization_memberships").select("*").eq("organization_id", organizationId),
    supabase.from("platform_users").select("*"),
    supabase.from("profiles").select("*"),
    supabase.from("nexaro_work_entries").select("*").eq("organization_id", organizationId).order("completed_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("nexaro_tasks").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
  ]);
  if ([membershipsResult, usersResult, profilesResult, workResult, nexaroTasksResult].some((result) => result.error)) {
    throw new Error("No se pudo cargar el expediente de la empresa.");
  }
  const users = usersResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const workEntries = workResult.data ?? [];
  const nexaroTasks = nexaroTasksResult.data ?? [];
  const restaurantSteps = mergeRestaurantRoadmapTasks(nexaroTasks);
  const unassignedRestaurantSteps = restaurantSteps.filter((step) => !step.stored || step.status === "cancelled");
  const completedRestaurantSteps = restaurantSteps.filter((step) => step.status === "completed" && step.completedAt);
  const workTimeline = [
    ...workEntries.map((entry) => ({ kind: "manual" as const, id: entry.id, completedAt: entry.completed_on, entry })),
    ...completedRestaurantSteps.map((step) => ({ kind: "plan" as const, id: step.key, completedAt: step.completedAt as string, step })),
  ].sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
  const operationalTasks = nexaroTasks.filter((task) => !isRestaurantRoadmapTask(task));
  const pendingNexaroTasks = operationalTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled");
  const completedNexaroTasks = operationalTasks.filter((task) => task.status === "completed");
  const addWorkEntryForCompany = addWorkEntry.bind(null, organization.id);

  return (
    <main className="admin-page admin-company-page">
      <Link className="admin-back" href="/admin"><ArrowLeft size={16} /> Todas las empresas</Link>
      <div className="admin-company-hero">
        <div className="admin-company-hero-mark">{organization.name.slice(0, 2).toUpperCase()}</div>
        <div><p>Expediente de empresa</p><h1>{organization.name}</h1><span>{organization.sector ?? "Sector sin definir"} · {organization.city ?? organization.country}</span></div>
      </div>

      <section className="admin-company-facts">
        <article><Building2 size={18} /><span><small>Empresa</small><strong>{organization.legal_name ?? organization.name}</strong></span></article>
        <article><Globe2 size={18} /><span><small>Sitio web</small><strong>{organization.website ? <a href={organization.website} target="_blank" rel="noreferrer">Abrir sitio</a> : "No registrado"}</strong></span></article>
        <article><ClipboardList size={18} /><span><small>Pasos del plan pendientes</small><strong>{restaurantSteps.filter((step) => step.stored && (step.status === "pending" || step.status === "in_progress")).length}</strong></span></article>
        <article><CheckCircle2 size={18} /><span><small>Trabajos Nexaro</small><strong>{workTimeline.length}</strong></span></article>
      </section>

      <div className="admin-company-columns">
        <div className="admin-company-primary">
          <AuthMessage error={messages.error} success={messages.success} />
          <section className="admin-panel admin-plan-catalog admin-restaurant-plan">
            <div className="admin-section-title"><div><p>Plan del restaurante</p><h2>Fases y seguimiento de Nexaro</h2></div><span>{restaurantSteps.filter((step) => step.stored && step.status !== "cancelled").length}/{restaurantSteps.length} añadidos</span></div>
            <p className="admin-plan-intro">“En el recorrido” significa que el paso está asignado al restaurante. Sólo se muestra en verde cuando Nexaro lo marca como comprobado.</p>
            <div className="admin-plan-checklist">{restaurantRoadmapStages.map((stage) => {
              const stageSteps = restaurantSteps.filter((step) => step.stage === stage.stage);
              const assignedCount = stageSteps.filter((step) => step.stored && step.status !== "cancelled").length;
              const completedCount = stageSteps.filter((step) => step.stored && step.status === "completed").length;
              const fullyCompleted = assignedCount > 0 && completedCount === assignedCount;
              const active = !fullyCompleted && stageSteps.some((step) => step.stored && (step.status === "completed" || step.status === "in_progress"));
              return <details className={`admin-plan-checklist-phase ${fullyCompleted ? "is-complete" : ""} ${active ? "is-active" : ""}`} key={stage.stage} open>
                <summary><span className="admin-plan-stage">{fullyCompleted ? <CheckCircle2 size={16} /> : stage.stage}</span><div><small>Fase {stage.stage} · {stage.period}</small><strong>{stage.title}</strong></div><b><span>{assignedCount}/{stageSteps.length} en el recorrido</span><em>{completedCount}/{assignedCount || stageSteps.length} comprobados</em></b></summary>
                <div>{stageSteps.map((step) => {
                  const assigned = step.stored && step.status !== "cancelled";
                  if (!assigned) return <label key={step.key}><input form="restaurant-roadmap-selection" type="checkbox" name="stepKey" value={step.key} /><span className="admin-plan-checklist-detail"><span className="admin-plan-item-title"><b>{step.code}</b><strong>{step.title}</strong></span><p>{step.description}</p><dl><div><dt>Necesitamos del restaurante</dt><dd>{step.restaurantInput}</dd></div><div><dt>Acción de Nexaro</dt><dd>{step.nexaroAction}</dd></div><div><dt>Comprobación</dt><dd>{step.evidence}</dd></div></dl></span></label>;
                  return <details className={`admin-plan-assigned-step status-${step.status}`} key={step.key}>
                    <summary>{step.status === "completed" ? <CheckCircle2 size={17} /> : step.status === "in_progress" ? <CircleDot size={17} /> : <Circle size={17} />}<span><small>{step.code} · {step.stageTitle}</small><strong>{step.title}</strong></span><b>{restaurantStatusLabels[step.status]}</b></summary>
                    <div className="admin-plan-card-detail"><p>{step.description}</p><dl><div><dt>Necesitamos del restaurante</dt><dd>{step.restaurantInput}</dd></div><div><dt>Acción de Nexaro</dt><dd>{step.nexaroAction}</dd></div><div><dt>Comprobación</dt><dd>{step.evidence}</dd></div></dl></div>
                    <div className="admin-plan-editor"><form action={updateRestaurantRoadmapStep.bind(null, organization.id, step.key)}>
                      <div className="admin-restaurant-step-fields"><label>Estado<select name="status" defaultValue={step.status}><option value="pending">Pendiente</option><option value="in_progress">En curso</option><option value="completed">Comprobado</option><option value="cancelled">No incluido</option></select></label><label>Fecha prevista<input name="dueDate" type="date" defaultValue={step.dueAt?.slice(0, 10) ?? ""} /></label><label>Fecha realizada<input name="completedDate" type="date" defaultValue={step.completedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} /></label></div>
                      <label className="admin-restaurant-note">Actualización visible para el restaurante<textarea name="note" rows={2} maxLength={1200} defaultValue={step.note ?? ""} placeholder="Ej. Ficha de Google corregida y comprobada desde móvil." /></label>
                      <div className="admin-restaurant-step-footer"><small>Prueba esperada: {step.evidence}</small><SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton></div>
                    </form></div>
                  </details>;
                })}</div>
              </details>;
            })}</div>
            <RoadmapSelectionForm formId="restaurant-roadmap-selection" availableCount={unassignedRestaurantSteps.length} action={assignRestaurantRoadmapSteps.bind(null, organization.id)} />
          </section>

          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Intervención</p><h2>Registrar trabajo realizado</h2></div><span>Visible para el cliente</span></div>
            <form action={addWorkEntryForCompany} className="admin-work-form">
              <div className="field field-wide"><label htmlFor="title">Trabajo realizado *</label><input id="title" name="title" required minLength={3} maxLength={160} placeholder="Ej. Optimización de la ficha de Google" /></div>
              <div className="field"><label htmlFor="category">Categoría *</label><select id="category" name="category" required defaultValue="website">{workCategories.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}</select></div>
              <div className="field"><label htmlFor="completedOn">Fecha de finalización *</label><input id="completedOn" name="completedOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div className="field field-wide"><label htmlFor="description">Detalle</label><textarea id="description" name="description" maxLength={1200} rows={4} placeholder="Qué se hizo, alcance y resultado entregado." /></div>
              <div className="admin-work-form-footer"><span>Se añadirá al historial de la empresa.</span><SubmitButton pendingLabel="Registrando…">Registrar trabajo</SubmitButton></div>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Seguimiento cronológico</p><h2>Trabajo realizado por Nexaro</h2></div><span>{workTimeline.length} registros</span></div>
            {workTimeline.length ? <div className="admin-work-timeline">{workTimeline.map((item) => item.kind === "manual" ? (
              <article key={`manual:${item.id}`}><span className="admin-work-date"><CalendarDays size={15} />{formatDate(item.entry.completed_on)}</span><div><small>{workCategoryLabel(item.entry.category)}</small><h3>{item.entry.title}</h3>{item.entry.description && <p>{item.entry.description}</p>}<details className="admin-work-edit"><summary>Editar trabajo</summary><form action={updateWorkEntry.bind(null, organization.id, item.entry.id)}><label>Título<input name="title" required minLength={3} maxLength={160} defaultValue={item.entry.title} /></label><label>Categoría<select name="category" required defaultValue={item.entry.category}>{workCategories.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}</select></label><label>Fecha de finalización<input name="completedOn" type="date" required defaultValue={item.entry.completed_on} /></label><label className="wide">Detalle<textarea name="description" maxLength={1200} rows={3} defaultValue={item.entry.description ?? ""} /></label><div className="wide"><SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton></div></form></details></div></article>
            ) : (
              <article key={`plan:${item.id}`}><span className="admin-work-date"><CalendarDays size={15} />{formatDate(item.completedAt)}</span><div><small>Plan del restaurante · {item.step.code}</small><h3>{item.step.title}</h3><p>{item.step.note || `Comprobado: ${item.step.evidence}`}</p><details className="admin-work-edit"><summary>Editar registro</summary><form action={updateRestaurantRoadmapStep.bind(null, organization.id, item.step.key)}><label>Estado<select name="status" defaultValue="completed"><option value="completed">Comprobado</option><option value="in_progress">En curso</option><option value="pending">Pendiente</option><option value="cancelled">No incluido</option></select></label><label>Fecha de finalización<input name="completedDate" type="date" required defaultValue={item.completedAt.slice(0, 10)} /></label><input name="dueDate" type="hidden" value={item.step.dueAt?.slice(0, 10) ?? ""} /><label className="wide">Actualización visible<textarea name="note" maxLength={1200} rows={3} defaultValue={item.step.note ?? ""} /></label><div className="wide"><SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton></div></form></details></div></article>
            ))}</div> : <div className="admin-empty compact"><CheckCircle2 size={22} /><strong>Aún no hay trabajos registrados.</strong><span>Completa un paso del plan o registra una intervención adicional.</span></div>}
          </section>

          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Operación</p><h2>Tareas asignadas por Nexaro</h2></div><span>{pendingNexaroTasks.length} acciones</span></div>
            {pendingNexaroTasks.length ? <div className="admin-pending-tasks">{pendingNexaroTasks.map((task) => (
              <article key={task.id}><i style={{ background: task.source === "visibility" ? "var(--accent)" : "var(--ink-600)" }} /><div><strong>{task.title}</strong><small>{task.source === "visibility" ? "Visibilidad SEO e IA" : "Seguimiento Nexaro"} · Prioridad {task.priority}</small>{task.description && <p>{task.description}</p>}</div><form action={completeNexaroTask.bind(null, organization.id, task.id)}><button type="submit"><CheckCircle2 size={15} /> Marcar realizada</button></form></article>
            ))}</div> : <div className="admin-empty compact"><ClipboardList size={22} /><strong>No hay tareas operativas pendientes.</strong><span>Las recomendaciones convertidas en tarea aparecerán aquí.</span></div>}
          </section>

          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Seguimiento</p><h2>Tareas realizadas y comprobadas</h2></div><span>{completedNexaroTasks.length} acciones</span></div>
            {completedNexaroTasks.length > 0 && <div className="admin-completed-tasks">{completedNexaroTasks.map((task) => (
              <article key={task.id}><CheckCircle2 size={17} /><div><strong>{task.title}</strong><small>{task.source === "visibility" ? "Visibilidad SEO e IA" : "Seguimiento Nexaro"} · Realizada el {task.completed_at ? formatDate(task.completed_at) : "—"}</small></div><form action={reopenNexaroTask.bind(null, organization.id, task.id)}><button type="submit"><RotateCcw size={14} /> Volver a pendientes</button></form></article>
            ))}</div>}
            {!completedNexaroTasks.length && <div className="admin-empty compact"><CheckCircle2 size={22} /><strong>Aún no hay tareas operativas realizadas.</strong><span>Los pasos del plan comprobados aparecen en el historial cronológico superior.</span></div>}
          </section>
        </div>

        <aside className="admin-company-secondary">
          <section className="admin-panel admin-visibility-entry">
            <div className="admin-section-title"><div><p>SEO e IA</p><h2>Visibilidad de la empresa</h2></div><ScanSearch size={19} /></div>
            <p>Configura preguntas, competidores y proveedores; después ejecuta y revisa sus evidencias.</p>
            <Link href={`/admin/empresas/${organization.id}/visibilidad`}>Abrir control de visibilidad <ArrowLeft size={15} /></Link>
          </section>
          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Personas</p><h2>Usuarios vinculados</h2></div><span>{memberships.length}</span></div>
            <div className="admin-member-list">{memberships.map((membership) => {
              const user = users.find((item) => item.user_id === membership.user_id);
              const profile = profiles.find((item) => item.user_id === membership.user_id);
              return <article key={membership.user_id}><UserRound size={17} /><span><strong>{profile?.full_name ?? "Sin nombre"}</strong><small><Mail size={12} /> {user?.email ?? "Sin correo"}</small></span><b>{membership.role === "owner" ? "Propietario" : membership.role}</b><details className="admin-password-reset"><summary><KeyRound size={14} /> Cambiar contraseña</summary><form action={resetMemberPassword.bind(null, organization.id, membership.user_id)}><p>Define una clave nueva sin enviar correo. Entrégala únicamente al usuario correspondiente.</p><PasswordField id={`password-${membership.user_id}`} name="password" label="Nueva contraseña" autoComplete="new-password" minLength={8} help="Mínimo 8 caracteres." /><PasswordField id={`password-confirmation-${membership.user_id}`} name="passwordConfirmation" label="Repite la contraseña" autoComplete="new-password" minLength={8} /><SubmitButton pendingLabel="Cambiando…">Guardar nueva contraseña</SubmitButton></form></details></article>;
            })}</div>
          </section>
        </aside>
      </div>
    </main>
  );
}
