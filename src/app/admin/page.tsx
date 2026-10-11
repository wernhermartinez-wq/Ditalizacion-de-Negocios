import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, CircleDashed, Clock3, Route, UsersRound } from "lucide-react";
import { CreateCompanyDialog } from "@/components/admin/create-company-dialog";
import { AuthMessage } from "@/components/auth/message";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Control Nexaro" };

function shortDate(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [supabase, messages] = await Promise.all([createClient(), searchParams]);
  const [usersResult, profilesResult, membershipsResult, organizationsResult, workResult, registrationsResult, nexaroTasksResult] = await Promise.all([
    supabase.from("platform_users").select("*").order("registered_at", { ascending: false }),
    supabase.from("profiles").select("*"),
    supabase.from("organization_memberships").select("*"),
    supabase.from("organizations").select("*").order("created_at", { ascending: false }),
    supabase.from("nexaro_work_entries").select("*"),
    supabase.from("company_registrations").select("*").order("created_at", { ascending: false }),
    supabase.from("nexaro_tasks").select("organization_id,status,source_reference"),
  ]);
  const firstError = [usersResult, profilesResult, membershipsResult, organizationsResult, workResult, registrationsResult, nexaroTasksResult].find((result) => result.error)?.error;
  if (firstError) throw new Error("No se pudo cargar el control administrativo.");

  const users = usersResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const organizations = organizationsResult.data ?? [];
  const workEntries = workResult.data ?? [];
  const restaurantTasks = (nexaroTasksResult.data ?? []).filter((task) => task.source_reference?.startsWith("restaurant:"));
  const pendingRegistrations = (registrationsResult.data ?? []).filter((registration) => registration.status === "pending");
  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const userById = new Map(users.map((user) => [user.user_id, user]));
  const organizationsWithPlan = new Set(restaurantTasks.filter((task) => task.status !== "cancelled").map((task) => task.organization_id)).size;
  const usersWithoutCompany = users.filter((user) => !memberships.some((membership) => membership.user_id === user.user_id));

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div><p>Panel operativo</p><h1>Qué necesita cada restaurante y qué hizo Nexaro.</h1><span>El estado se calcula con el plan específico de cada restaurante y el trabajo realizado por Nexaro.</span></div>
        <div className="admin-heading-actions"><CreateCompanyDialog /><div className="admin-date">Actualizado<br /><strong>{shortDate(new Date().toISOString())}</strong></div></div>
      </div>

      <AuthMessage error={messages.error} success={messages.success} />

      <section className="admin-kpis" aria-label="Resumen administrativo">
        <article><UsersRound size={20} /><span><small>Usuarios registrados</small><strong>{users.length}</strong></span></article>
        <article><Building2 size={20} /><span><small>Empresas activas</small><strong>{organizations.length}</strong></span></article>
        <article><Route size={20} /><span><small>Planes activos</small><strong>{organizationsWithPlan}</strong></span></article>
        <article><CheckCircle2 size={20} /><span><small>Trabajos registrados</small><strong>{workEntries.length}</strong></span></article>
      </section>

      {pendingRegistrations.length > 0 && (
        <section className="admin-registration-panel">
          <div className="admin-section-title"><div><p>Por activar</p><h2>Altas pendientes</h2></div><span>{pendingRegistrations.length} pendientes</span></div>
          <div className="admin-registration-list">
            {pendingRegistrations.map((registration) => (
              <article key={registration.id}>
                <span className="admin-registration-icon"><Clock3 size={17} /></span>
                <span><strong>{registration.company_name}</strong><small>{registration.contact_name} · {registration.email}</small></span>
                <span><small>Estado</small><strong>Pendiente de registro</strong></span>
                <span><small>Creada</small><strong>{shortDate(registration.created_at)}</strong></span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="admin-company-board">
        <div className="admin-section-title"><div><p>Empresas</p><h2>Seguimiento operativo</h2></div><span>{organizations.length} espacios</span></div>
        {organizations.length ? (
          <div className="admin-company-list">
            {organizations.map((organization) => {
              const companyMemberships = memberships.filter((membership) => membership.organization_id === organization.id);
              const ownerMembership = companyMemberships.find((membership) => membership.role === "owner") ?? companyMemberships[0];
              const ownerUser = ownerMembership ? userById.get(ownerMembership.user_id) : null;
              const ownerProfile = ownerMembership ? profileByUser.get(ownerMembership.user_id) : null;
              const companyPlanTasks = restaurantTasks.filter((task) => task.organization_id === organization.id && task.status !== "cancelled");
              const completedPlanTasks = companyPlanTasks.filter((task) => task.status === "completed").length;
              const pendingPlanTasks = companyPlanTasks.filter((task) => task.status === "pending" || task.status === "in_progress").length;
              const companyWork = workEntries.filter((entry) => entry.organization_id === organization.id).length;
              return (
                <Link className="admin-company-row" href={`/admin/empresas/${organization.id}`} key={organization.id}>
                  <span className="admin-company-mark">{organization.name.slice(0, 2).toUpperCase()}</span>
                  <span className="admin-company-identity"><strong>{organization.name}</strong><small>{ownerProfile?.full_name ?? "Responsable sin nombre"} · {ownerUser?.email ?? "Sin correo"}</small></span>
                  <span><small>Sector</small><strong>{organization.sector ?? "Sin definir"}</strong></span>
                  <span><small>Plan Nexaro</small><strong className={companyPlanTasks.length ? "status-complete" : "status-pending"}>{companyPlanTasks.length ? `${completedPlanTasks}/${companyPlanTasks.length} comprobados` : "Por preparar"}</strong></span>
                  <span><small>Intervenciones</small><strong>{companyWork + completedPlanTasks}</strong></span>
                  <span><small>Pasos pendientes</small><strong>{pendingPlanTasks || "—"}</strong></span>
                  <ArrowRight size={18} />
                </Link>
              );
            })}
          </div>
        ) : <div className="admin-empty"><Building2 size={24} /><strong>Todavía no hay empresas.</strong><span>Aparecerán cuando un usuario complete su perfil empresarial.</span></div>}
      </section>

      <section className="admin-users-panel">
        <div className="admin-section-title"><div><p>Accesos</p><h2>Usuarios registrados</h2></div><span>{usersWithoutCompany.length} sin empresa</span></div>
        <div className="admin-user-list">
          {users.map((user) => {
            const profile = profileByUser.get(user.user_id);
            const membership = memberships.find((item) => item.user_id === user.user_id);
            const organization = membership ? organizations.find((item) => item.id === membership.organization_id) : null;
            return (
              <div key={user.user_id}>
                <span className="admin-user-state">{user.last_sign_in_at ? <CheckCircle2 size={15} /> : <CircleDashed size={15} />}</span>
                <span><strong>{profile?.full_name ?? user.email ?? "Usuario sin nombre"}</strong><small>{user.email ?? "Sin correo"}</small></span>
                <span><small>Empresa</small><strong>{organization?.name ?? "Sin configurar"}</strong></span>
                <span><small>Último acceso</small><strong>{shortDate(user.last_sign_in_at)}</strong></span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
