import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/app/dashboard";
import { getCurrentOrganization } from "@/lib/organizations";
import { assignedRestaurantRoadmapSteps } from "@/lib/restaurant-roadmap";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");
  const [tasksResult, workResult] = await Promise.all([
    supabase.from("nexaro_tasks").select("*").eq("organization_id", organization.id).order("created_at"),
    supabase.from("nexaro_work_entries").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
  ]);
  if (tasksResult.error || workResult.error) throw new Error("No se pudo cargar el seguimiento del restaurante.");
  const steps = assignedRestaurantRoadmapSteps(tasksResult.data ?? []);
  const completedPlanSteps = steps.filter((step) => step.status === "completed").length;
  return <Dashboard organizationName={organization.name} steps={steps} workCount={(workResult.count ?? 0) + completedPlanSteps} />;
}
