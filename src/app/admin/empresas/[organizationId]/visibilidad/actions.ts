"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { executeVisibilityRun } from "@/lib/visibility/runner";
import { recommendationToTask } from "@/lib/visibility/recommendations";
import { visibilityLimits } from "@/lib/visibility/config";

const clean = (value: FormDataEntryValue | null, max = 1000) => String(value ?? "").trim().slice(0, max);
const list = (value: FormDataEntryValue | null, max: number) => clean(value, 2000).split(/[,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, max);
const base = (organizationId: string) => `/admin/empresas/${organizationId}/visibilidad`;
const go = (organizationId: string, type: "error" | "success", text: string): never => redirect(`${base(organizationId)}?${new URLSearchParams({ [type]: text })}`);

async function adminContext(organizationId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) redirect("/admin");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");
  return { supabase, userId };
}

export async function saveVisibilityProject(organizationId: string, formData: FormData) {
  const { supabase, userId } = await adminContext(organizationId);
  const brandName = clean(formData.get("brandName"), 120);
  const domain = clean(formData.get("domain"), 253).replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (brandName.length < 2 || domain.length < 3) go(organizationId, "error", "Indica una marca y un dominio válidos.");
  const payload = {
    organization_id: organizationId, brand_name: brandName, domain, brand_variants: list(formData.get("brandVariants"), 10),
    services: list(formData.get("services"), 20), business_description: clean(formData.get("description"), 2000) || null,
    target_audience: clean(formData.get("audience"), 1000) || null, country: clean(formData.get("country"), 2).toUpperCase() || "ES",
    region: clean(formData.get("region"), 120) || null, primary_language: clean(formData.get("language"), 2) === "de" ? "de" : "es",
    secondary_languages: list(formData.get("secondaryLanguages"), 2).filter((item) => item === "es" || item === "de"),
    objectives: list(formData.get("objectives"), 10), schedule_frequency: clean(formData.get("frequency"), 10) === "manual" ? "manual" : "weekly",
    settings: {
      max_competitors: Math.max(1, Math.min(Number(clean(formData.get("maxCompetitors"), 2)) || 3, 10)),
      max_active_prompts: Math.max(1, Math.min(Number(clean(formData.get("maxPrompts"), 3)) || 25, 100)),
    },
    status: "active", created_by: userId, updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("visibility_projects").upsert(payload, { onConflict: "organization_id" });
  if (error) go(organizationId, "error", "No se pudo guardar la configuración.");
  revalidatePath(base(organizationId)); revalidatePath("/app/visibilidad");
  go(organizationId, "success", "Configuración guardada.");
}

export async function addVisibilityCompetitor(organizationId: string, projectId: string, formData: FormData) {
  const { supabase } = await adminContext(organizationId);
  const project = await supabase.from("visibility_projects").select("settings").eq("id", projectId).eq("organization_id", organizationId).maybeSingle();
  const projectData = project.data;
  if (!projectData) return go(organizationId, "error", "El proyecto no pertenece a esta empresa.");
  const limits = visibilityLimits(projectData.settings);
  const count = await supabase.from("visibility_competitors").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("active", true);
  if ((count.count ?? 0) >= limits.maxCompetitors) go(organizationId, "error", `El límite configurado es de ${limits.maxCompetitors} competidores activos.`);
  const name = clean(formData.get("name"), 120); const domain = clean(formData.get("domain"), 253).replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (name.length < 2 || domain.length < 3) go(organizationId, "error", "Revisa el nombre y el dominio del competidor.");
  const { error } = await supabase.from("visibility_competitors").insert({ project_id: projectId, name, domain, name_variants: list(formData.get("variants"), 10) });
  if (error) go(organizationId, "error", "No se pudo añadir el competidor.");
  revalidatePath(base(organizationId)); go(organizationId, "success", "Competidor añadido.");
}

export async function addVisibilityPrompt(organizationId: string, projectId: string, formData: FormData) {
  const { supabase, userId } = await adminContext(organizationId);
  const project = await supabase.from("visibility_projects").select("settings").eq("id", projectId).eq("organization_id", organizationId).maybeSingle();
  const projectData = project.data;
  if (!projectData) return go(organizationId, "error", "El proyecto no pertenece a esta empresa.");
  const limits = visibilityLimits(projectData.settings);
  const count = await supabase.from("visibility_prompts").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("active", true);
  if ((count.count ?? 0) >= limits.maxActivePrompts) go(organizationId, "error", `El límite configurado es de ${limits.maxActivePrompts} preguntas activas.`);
  const question = clean(formData.get("question"), 800);
  if (question.length < 10) go(organizationId, "error", "La pregunta debe ser más concreta.");
  const language = clean(formData.get("language"), 2) === "de" ? "de" : "es";
  const { error } = await supabase.from("visibility_prompts").insert({ project_id: projectId, question, country: clean(formData.get("country"), 2).toUpperCase() || "ES", language, created_by: userId, status: "suggested" });
  if (error) go(organizationId, "error", "No se pudo añadir la pregunta.");
  revalidatePath(base(organizationId)); revalidatePath("/app/visibilidad");
  go(organizationId, "success", "Pregunta enviada al cliente para aprobación.");
}

export async function updateVisibilityPrompt(organizationId: string, projectId: string, promptId: string, formData: FormData) {
  const { supabase } = await adminContext(organizationId);
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !/^[0-9a-f-]{36}$/i.test(promptId)) go(organizationId, "error", "La pregunta no es válida.");
  const question = clean(formData.get("question"), 800);
  if (question.length < 10) go(organizationId, "error", "La pregunta debe ser más concreta.");
  const project = await supabase.from("visibility_projects").select("id").eq("id", projectId).eq("organization_id", organizationId).maybeSingle();
  if (!project.data) go(organizationId, "error", "El proyecto no pertenece a esta empresa.");
  const { error } = await supabase.from("visibility_prompts").update({
    question,
    country: clean(formData.get("country"), 2).toUpperCase() || "ES",
    language: clean(formData.get("language"), 2) === "de" ? "de" : "es",
    active: formData.get("active") === "on",
    status: "suggested",
    approved_at: null,
    approved_by: null,
    updated_at: new Date().toISOString(),
  }).eq("id", promptId).eq("project_id", projectId);
  if (error) go(organizationId, "error", "No se pudo actualizar la pregunta.");
  revalidatePath(base(organizationId)); revalidatePath("/app/visibilidad");
  go(organizationId, "success", "Pregunta actualizada y enviada de nuevo para aprobación.");
}

export async function runVisibilityNow(organizationId: string, projectId: string) {
  const { userId } = await adminContext(organizationId);
  try {
    await executeVisibilityRun({ projectId, idempotencyKey: `manual-${new Date().toISOString().slice(0, 16)}-${userId}`, triggerType: "manual", createdBy: userId });
  } catch (error) { go(organizationId, "error", error instanceof Error ? error.message : "No se pudo ejecutar el análisis."); }
  revalidatePath(base(organizationId)); revalidatePath("/app/visibilidad");
  go(organizationId, "success", "Análisis terminado.");
}

export async function runVisibilityPrompt(organizationId: string, projectId: string, promptId: string) {
  const { supabase, userId } = await adminContext(organizationId);
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !/^[0-9a-f-]{36}$/i.test(promptId)) go(organizationId, "error", "La pregunta no es válida.");
  const { data: prompt } = await supabase
    .from("visibility_prompts")
    .select("id, visibility_projects!inner(organization_id)")
    .eq("id", promptId)
    .eq("project_id", projectId)
    .eq("status", "approved")
    .maybeSingle();
  if (!prompt || prompt.visibility_projects.organization_id !== organizationId) go(organizationId, "error", "La pregunta no está aprobada para esta empresa.");
  try {
    await executeVisibilityRun({
      projectId,
      promptIds: [promptId],
      idempotencyKey: `prompt-${promptId}-${new Date().toISOString().slice(0, 16)}-${userId}`,
      triggerType: "manual",
      createdBy: userId,
    });
  } catch (error) { go(organizationId, "error", error instanceof Error ? error.message : "No se pudo ejecutar la pregunta."); }
  revalidatePath(base(organizationId)); revalidatePath("/app/visibilidad");
  go(organizationId, "success", "Pregunta ejecutada y analizada.");
}

export async function convertRecommendationToTask(organizationId: string, recommendationId: string) {
  const { supabase, userId } = await adminContext(organizationId);
  const { data: recommendation } = await supabase.from("visibility_recommendations").select("*, visibility_projects!inner(organization_id)").eq("id", recommendationId).maybeSingle();
  if (!recommendation || recommendation.visibility_projects.organization_id !== organizationId || recommendation.nexaro_task_id) go(organizationId, "error", "La recomendación no está disponible.");
  if (!recommendation) return;
  const task = await supabase.from("nexaro_tasks").insert({ organization_id: organizationId, ...recommendationToTask(recommendation), created_by: userId }).select("id").single();
  if (task.error) go(organizationId, "error", "No se pudo crear la tarea.");
  if (!task.data) return;
  await supabase.from("visibility_recommendations").update({ status: "task_created", nexaro_task_id: task.data.id, updated_at: new Date().toISOString() }).eq("id", recommendation.id);
  revalidatePath(base(organizationId)); revalidatePath("/app/tareas");
  go(organizationId, "success", "Recomendación convertida en tarea Nexaro.");
}
