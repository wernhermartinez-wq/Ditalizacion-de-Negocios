import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, FolderKanban } from "lucide-react";
import { getCurrentOrganization } from "@/lib/organizations";
import { assignedRestaurantRoadmapSteps } from "@/lib/restaurant-roadmap";
import { createClient } from "@/lib/supabase/server";
import { workCategoryLabel } from "@/lib/work";

export const metadata: Metadata = { title: "Trabajo de Nexaro" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export default async function NexaroWorkPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  const organization = userId ? await getCurrentOrganization(supabase, userId) : null;
  const [workResult, tasksResult] = organization
    ? await Promise.all([
        supabase.from("nexaro_work_entries").select("*").eq("organization_id", organization.id).order("completed_on", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("nexaro_tasks").select("*").eq("organization_id", organization.id),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (workResult.error || tasksResult.error) throw new Error("No se pudo cargar el trabajo realizado por Nexaro.");

  const timeline = [
    ...(workResult.data ?? []).map((entry) => ({
      id: `work:${entry.id}`,
      title: entry.title,
      description: entry.description,
      category: workCategoryLabel(entry.category),
      completedAt: entry.completed_on,
    })),
    ...assignedRestaurantRoadmapSteps(tasksResult.data ?? [])
      .filter((step) => step.status === "completed" && step.completedAt)
      .map((step) => ({
        id: `plan:${step.key}`,
        title: step.title,
        description: step.note || `Resultado comprobado: ${step.evidence}`,
        category: "Plan del restaurante",
        completedAt: step.completedAt as string,
      })),
  ].sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());

  return (
    <main className="page-content nexaro-work-page">
      <div className="page-heading work-page-heading">
        <div><p>Seguimiento de servicio</p><h1>Trabajo realizado por Nexaro.</h1><span className="page-description">Un registro claro de las mejoras, entregables y actuaciones realizadas para tu empresa.</span></div>
        <span className="work-total"><CheckCircle2 size={17} /> {timeline.length} {timeline.length === 1 ? "intervención" : "intervenciones"}</span>
      </div>

      {!organization ? (
        <section className="state-card nexaro-work-empty"><FolderKanban size={28} /><h2>Primero configura tu empresa.</h2><p>Cuando exista un espacio empresarial, Nexaro podrá asociar y documentar el trabajo realizado.</p></section>
      ) : timeline.length ? (
        <section className="client-work-log" aria-label="Historial de trabajos realizados">
          <header><div><p>Historial verificado</p><h2>{organization.name}</h2></div><span>Actualizado por el equipo Nexaro</span></header>
          <div className="client-work-timeline">
            {timeline.map((entry) => (
              <article key={entry.id}>
                <div className="client-work-marker"><CheckCircle2 size={17} /></div>
                <div className="client-work-card">
                  <div className="client-work-meta"><span>{entry.category}</span><time dateTime={entry.completedAt}><CalendarDays size={14} /> {formatDate(entry.completedAt)}</time></div>
                  <h3>{entry.title}</h3>
                  {entry.description && <p>{entry.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="state-card nexaro-work-empty"><FolderKanban size={28} /><h2>Aún no hay trabajos registrados.</h2><p>Este historial se irá completando a medida que Nexaro finalice mejoras y entregables para {organization.name}.</p></section>
      )}
    </main>
  );
}
