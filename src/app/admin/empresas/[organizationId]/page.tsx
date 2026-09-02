import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, ClipboardList, Globe2, Mail, RotateCcw, UserRound } from "lucide-react";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { buildRoadmap, roadmapTasks } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";
import { workCategories, workCategoryLabel } from "@/lib/work";
import { addWorkEntry, completeRoadmapTask, reopenRoadmapTask } from "./actions";

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

  const { data: activeQuestionnaire } = await supabase.from("diagnostic_questionnaires").select("id").eq("is_active", true).single();
  const [membershipsResult, usersResult, profilesResult, diagnosticsResult, workResult, questionsResult] = await Promise.all([
    supabase.from("organization_memberships").select("*").eq("organization_id", organizationId),
    supabase.from("platform_users").select("*"),
    supabase.from("profiles").select("*"),
    activeQuestionnaire
      ? supabase.from("diagnostics").select("*").eq("organization_id", organizationId).eq("questionnaire_id", activeQuestionnaire.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("nexaro_work_entries").select("*").eq("organization_id", organizationId).order("completed_on", { ascending: false }).order("created_at", { ascending: false }),
    activeQuestionnaire
      ? supabase.from("diagnostic_questions").select("*").eq("questionnaire_id", activeQuestionnaire.id).order("position")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if ([membershipsResult, usersResult, profilesResult, diagnosticsResult, workResult, questionsResult].some((result) => result.error)) {
    throw new Error("No se pudo cargar el expediente de la empresa.");
  }

  const diagnostic = diagnosticsResult.data;
  const [responsesResult, completionsResult] = diagnostic
    ? await Promise.all([
        supabase.from("diagnostic_responses").select("*").eq("diagnostic_id", diagnostic.id),
        supabase.from("roadmap_task_completions").select("*").eq("diagnostic_id", diagnostic.id).order("completed_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (responsesResult.error || completionsResult.error) throw new Error("No se pudo cargar el avance de la empresa.");
  const questions = questionsResult.data ?? [];
  const responses = responsesResult.data ?? [];
  const allTasks = diagnostic?.status === "completed" ? roadmapTasks(buildRoadmap(questions, responses)) : [];
  const completions = completionsResult.data ?? [];
  const completedKeys = new Set(completions.map((completion) => completion.task_key));
  const tasks = allTasks.filter((task) => !completedKeys.has(task.id));
  const taskByKey = new Map(allTasks.map((task) => [task.id, task]));
  const users = usersResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const workEntries = workResult.data ?? [];
  const addWorkEntryForCompany = addWorkEntry.bind(null, organization.id);

  return (
    <main className="admin-page admin-company-page">
      <Link className="admin-back" href="/admin"><ArrowLeft size={16} /> Todas las empresas</Link>
      <div className="admin-company-hero">
        <div className="admin-company-hero-mark">{organization.name.slice(0, 2).toUpperCase()}</div>
        <div><p>Expediente de empresa</p><h1>{organization.name}</h1><span>{organization.sector ?? "Sector sin definir"} · {organization.city ?? organization.country}</span></div>
        <div className={`admin-diagnostic-state ${diagnostic?.status === "completed" ? "complete" : "pending"}`}>
          <small>Diagnóstico comercial</small>
          <strong>{diagnostic?.status === "completed" ? `${Math.round(diagnostic.provisional_score ?? 0)}/100` : diagnostic ? "En curso" : "Pendiente"}</strong>
        </div>
      </div>

      <section className="admin-company-facts">
        <article><Building2 size={18} /><span><small>Empresa</small><strong>{organization.legal_name ?? organization.name}</strong></span></article>
        <article><Globe2 size={18} /><span><small>Sitio web</small><strong>{organization.website ? <a href={organization.website} target="_blank" rel="noreferrer">Abrir sitio</a> : "No registrado"}</strong></span></article>
        <article><ClipboardList size={18} /><span><small>Tareas pendientes</small><strong>{diagnostic?.status === "completed" ? tasks.length : "Pendientes del diagnóstico"}</strong></span></article>
        <article><CheckCircle2 size={18} /><span><small>Trabajos Nexaro</small><strong>{workEntries.length}</strong></span></article>
      </section>

      <div className="admin-company-columns">
        <div className="admin-company-primary">
          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Intervención</p><h2>Registrar trabajo realizado</h2></div><span>Visible para el cliente</span></div>
            <AuthMessage error={messages.error} success={messages.success} />
            <form action={addWorkEntryForCompany} className="admin-work-form">
              <div className="field field-wide"><label htmlFor="title">Trabajo realizado *</label><input id="title" name="title" required minLength={3} maxLength={160} placeholder="Ej. Optimización de la ficha de Google" /></div>
              <div className="field"><label htmlFor="category">Categoría *</label><select id="category" name="category" required defaultValue="website">{workCategories.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}</select></div>
              <div className="field"><label htmlFor="completedOn">Fecha de finalización *</label><input id="completedOn" name="completedOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div className="field field-wide"><label htmlFor="description">Detalle</label><textarea id="description" name="description" maxLength={1200} rows={4} placeholder="Qué se hizo, alcance y resultado entregado." /></div>
              <div className="admin-work-form-footer"><span>Se añadirá al historial de la empresa.</span><SubmitButton pendingLabel="Registrando…">Registrar trabajo</SubmitButton></div>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Historial</p><h2>Trabajo realizado por Nexaro</h2></div><span>{workEntries.length} registros</span></div>
            {workEntries.length ? <div className="admin-work-timeline">{workEntries.map((entry) => (
              <article key={entry.id}><span className="admin-work-date"><CalendarDays size={15} />{formatDate(entry.completed_on)}</span><div><small>{workCategoryLabel(entry.category)}</small><h3>{entry.title}</h3>{entry.description && <p>{entry.description}</p>}</div></article>
            ))}</div> : <div className="admin-empty compact"><CheckCircle2 size={22} /><strong>Aún no hay trabajos registrados.</strong><span>Usa el formulario para documentar la primera intervención.</span></div>}
          </section>

          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Hoja de ruta</p><h2>Tareas pendientes sugeridas</h2></div><span>{tasks.length} acciones</span></div>
            {tasks.length && diagnostic ? <div className="admin-pending-tasks">{tasks.map((task) => (
              <article key={task.id} style={{ "--task-color": task.color } as CSSProperties}><i /><div><strong>{task.title}</strong><small>{task.code} · {task.dimension} · {task.period}</small></div><form action={completeRoadmapTask.bind(null, organization.id, diagnostic.id, task.id)}><button type="submit"><CheckCircle2 size={15} /> Marcar realizada</button></form></article>
            ))}</div> : <div className="admin-empty compact"><ClipboardList size={22} /><strong>{diagnostic?.status === "completed" ? "No quedan tareas pendientes." : "El diagnóstico comercial no está completado."}</strong><span>{diagnostic?.status === "completed" ? "Todas las acciones de esta hoja de ruta están realizadas." : "Las tareas aparecerán cuando la empresa finalice sus respuestas."}</span></div>}
          </section>

          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Seguimiento</p><h2>Tareas realizadas y comprobadas</h2></div><span>{completions.length} acciones</span></div>
            {completions.length && diagnostic ? <div className="admin-completed-tasks">{completions.map((completion) => {
              const task = taskByKey.get(completion.task_key);
              return <article key={completion.id}><CheckCircle2 size={17} /><div><strong>{completion.title}</strong><small>{task ? `${task.code} · ${task.dimension} · ` : ""}Realizada el {formatDate(completion.completed_at)}</small></div><form action={reopenRoadmapTask.bind(null, organization.id, diagnostic.id, completion.task_key)}><button type="submit"><RotateCcw size={14} /> Volver a pendientes</button></form></article>;
            })}</div> : <div className="admin-empty compact"><CheckCircle2 size={22} /><strong>Aún no hay tareas realizadas.</strong><span>Marca una acción cuando Nexaro la haya ejecutado y comprobado.</span></div>}
          </section>
        </div>

        <aside className="admin-company-secondary">
          <section className="admin-panel">
            <div className="admin-section-title"><div><p>Personas</p><h2>Usuarios vinculados</h2></div><span>{memberships.length}</span></div>
            <div className="admin-member-list">{memberships.map((membership) => {
              const user = users.find((item) => item.user_id === membership.user_id);
              const profile = profiles.find((item) => item.user_id === membership.user_id);
              return <article key={membership.user_id}><UserRound size={17} /><span><strong>{profile?.full_name ?? "Sin nombre"}</strong><small><Mail size={12} /> {user?.email ?? "Sin correo"}</small></span><b>{membership.role === "owner" ? "Propietario" : membership.role}</b></article>;
            })}</div>
          </section>
        </aside>
      </div>
    </main>
  );
}
