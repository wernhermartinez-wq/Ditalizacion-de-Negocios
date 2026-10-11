import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/app/dashboard";
import { getCurrentOrganization } from "@/lib/organizations";
import { mergeRestaurantRoadmapTasks } from "@/lib/restaurant-roadmap";
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
  if (tasksResult.error) throw new Error("No se pudo cargar el plan del restaurante.");
  return <Dashboard organizationName={organization.name} steps={mergeRestaurantRoadmapTasks(tasksResult.data ?? [])} workCount={workResult.count ?? 0} />;
}
