"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function approveVisibilityPrompt(promptId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(promptId)) redirect("/app/visibilidad?error=Pregunta no válida");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");
  const { data: prompt } = await supabase.from("visibility_prompts").select("id, project_id, status").eq("id", promptId).maybeSingle();
  const { data: project } = prompt ? await supabase.from("visibility_projects").select("organization_id").eq("id", prompt.project_id).maybeSingle() : { data: null };
  if (!prompt || !project || project.organization_id !== organization.id || prompt.status !== "suggested") redirect("/app/visibilidad?error=No se puede aprobar esta pregunta");
  const admin = createAdminClient();
  const { error } = await admin.from("visibility_prompts").update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", promptId).eq("status", "suggested");
  if (error) redirect("/app/visibilidad?error=No se pudo aprobar la pregunta");
  revalidatePath("/app/visibilidad");
  redirect("/app/visibilidad?success=Pregunta aprobada");
}
