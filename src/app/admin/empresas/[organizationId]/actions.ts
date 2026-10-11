"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";
import { buildDiagnosticSnapshot, DIAGNOSTIC_FORMULA_VERSION, loadDiagnosticSnapshot, roadmapFromSnapshot } from "@/lib/diagnostic-snapshots";
import { roadmapTasks } from "@/lib/roadmap";
import { getRestaurantRoadmapTemplate, restaurantTaskReference } from "@/lib/restaurant-roadmap";
import { createClient } from "@/lib/supabase/server";
import { workCategories } from "@/lib/work";

function field(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function message(organizationId: string, type: "error" | "success", text: string): never {
  redirect(`/admin/empresas/${organizationId}?${new URLSearchParams({ [type]: text })}`);
}

export async function addWorkEntry(organizationId: string, formData: FormData) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) redirect("/admin");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const title = field(formData, "title", 160);
  const description = field(formData, "description", 1200);
  const category = field(formData, "category", 40);
  const completedOn = field(formData, "completedOn", 10);
  const validCategories = new Set(workCategories.map((item) => item.value));
  if (title.length < 3 || !validCategories.has(category as (typeof workCategories)[number]["value"]) || !/^\d{4}-\d{2}-\d{2}$/.test(completedOn)) {
    message(organizationId, "error", "Revisa el título, la categoría y la fecha del trabajo.");
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();
  if (organizationError || !organization) message(organizationId, "error", "La empresa indicada no existe o no está disponible.");

  const { error } = await supabase.from("nexaro_work_entries").insert({
    organization_id: organizationId,
    title,
    description: description || null,
    category,
    completed_on: completedOn,
    created_by: userId,
  });
  if (error) message(organizationId, "error", "No se pudo registrar el trabajo realizado.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app/trabajo-nexaro");
  message(organizationId, "success", "Trabajo realizado registrado correctamente.");
}

export async function updateWorkEntry(organizationId: string, entryId: string, formData: FormData) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !/^[0-9a-f-]{36}$/i.test(entryId)) redirect("/admin");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const title = field(formData, "title", 160);
  const description = field(formData, "description", 1200);
  const category = field(formData, "category", 40);
  const completedOn = field(formData, "completedOn", 10);
  const validCategories = new Set(workCategories.map((item) => item.value));
  if (title.length < 3 || !validCategories.has(category as (typeof workCategories)[number]["value"]) || !/^\d{4}-\d{2}-\d{2}$/.test(completedOn)) {
    message(organizationId, "error", "Revisa el título, la categoría y la fecha del trabajo.");
  }

  const { data: entry, error: entryError } = await supabase.from("nexaro_work_entries").select("id").eq("id", entryId).eq("organization_id", organizationId).maybeSingle();
  if (entryError || !entry) message(organizationId, "error", "El trabajo indicado no existe o no está disponible.");
  const { error } = await supabase.from("nexaro_work_entries").update({ title, description: description || null, category, completed_on: completedOn, updated_at: new Date().toISOString() }).eq("id", entry.id).eq("organization_id", organizationId);
  if (error) message(organizationId, "error", "No se pudo actualizar el trabajo realizado.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app");
  revalidatePath("/app/trabajo-nexaro");
  message(organizationId, "success", "Trabajo realizado actualizado correctamente.");
}

export async function validateDiagnostic(organizationId: string, diagnosticId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !/^[0-9a-f-]{36}$/i.test(diagnosticId)) redirect("/admin");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const { data: diagnostic, error: diagnosticError } = await supabase
    .from("diagnostics")
    .select("id, questionnaire_id")
    .eq("id", diagnosticId)
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .maybeSingle();
  if (diagnosticError || !diagnostic) message(organizationId, "error", "El diagnóstico ya no está pendiente de validación.");

  const [questionsResult, responsesResult] = await Promise.all([
    supabase.from("diagnostic_questions").select("*").eq("questionnaire_id", diagnostic.questionnaire_id).order("position"),
    supabase.from("diagnostic_responses").select("*").eq("diagnostic_id", diagnostic.id),
  ]);
  if (questionsResult.error || responsesResult.error) message(organizationId, "error", "No se pudo preparar la validación.");

  const snapshot = buildDiagnosticSnapshot(questionsResult.data ?? [], responsesResult.data ?? []);
  const { error } = await supabase.rpc("validate_diagnostic_snapshot", {
    p_diagnostic_id: diagnostic.id,
    p_formula_version: DIAGNOSTIC_FORMULA_VERSION,
    p_scores: snapshot.scores,
    p_roadmap: snapshot.roadmap,
  });
  if (error) message(organizationId, "error", "No se pudo validar y congelar el diagnóstico.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app");
  revalidatePath("/app/diagnostico");
  revalidatePath("/app/hoja-de-ruta");
  revalidatePath("/app/tareas");
  message(organizationId, "success", "Diagnóstico validado. El resultado y la hoja de ruta han quedado congelados.");
}

export async function completeRoadmapTask(organizationId: string, diagnosticId: string, taskKey: string) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !/^[0-9a-f-]{36}$/i.test(diagnosticId) || !/^[A-Z]{3}-[1-3]$/.test(taskKey)) redirect("/admin");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const { data: diagnostic, error: diagnosticError } = await supabase
    .from("diagnostics")
    .select("id")
    .eq("id", diagnosticId)
    .eq("organization_id", organizationId)
    .eq("status", "validated")
    .maybeSingle();
  if (diagnosticError || !diagnostic) message(organizationId, "error", "No se pudo validar la tarea.");

  const snapshot = await loadDiagnosticSnapshot(supabase, diagnostic.id);
  const task = roadmapTasks(roadmapFromSnapshot(snapshot.itemRows))
    .find((candidate) => candidate.id === taskKey);
  if (!task) message(organizationId, "error", "Esta tarea no pertenece a la hoja de ruta actual.");

  const { error } = await supabase.from("roadmap_task_completions").insert({
    organization_id: organizationId,
    diagnostic_id: diagnostic.id,
    task_key: task.id,
    title: task.title,
    completed_by: userId,
  });
  if (error && error.code !== "23505") message(organizationId, "error", "No se pudo marcar la tarea como realizada.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app");
  revalidatePath("/app/tareas");
  message(organizationId, "success", "Tarea completada y visible en el historial del cliente.");
}

export async function reopenRoadmapTask(organizationId: string, diagnosticId: string, taskKey: string) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !/^[0-9a-f-]{36}$/i.test(diagnosticId) || !/^[A-Z]{3}-[1-3]$/.test(taskKey)) redirect("/admin");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const { data: diagnostic, error: diagnosticError } = await supabase
    .from("diagnostics")
    .select("id")
    .eq("id", diagnosticId)
    .eq("organization_id", organizationId)
    .eq("status", "validated")
    .maybeSingle();
  if (diagnosticError || !diagnostic) message(organizationId, "error", "No se pudo validar la tarea.");

  const { error } = await supabase
    .from("roadmap_task_completions")
    .delete()
    .eq("organization_id", organizationId)
    .eq("diagnostic_id", diagnostic.id)
    .eq("task_key", taskKey);
  if (error) message(organizationId, "error", "No se pudo devolver la tarea a pendientes.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app");
  revalidatePath("/app/tareas");
  message(organizationId, "success", "Tarea devuelta a pendientes.");
}

async function updateNexaroTask(organizationId: string, taskId: string, completed: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !/^[0-9a-f-]{36}$/i.test(taskId)) redirect("/admin");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const { data: task, error: taskError } = await supabase
    .from("nexaro_tasks")
    .select("id")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (taskError || !task) message(organizationId, "error", "No se pudo validar la tarea operativa.");

  const { error } = await supabase
    .from("nexaro_tasks")
    .update(completed
      ? { status: "completed", completed_at: new Date().toISOString(), completed_by: userId }
      : { status: "pending", completed_at: null, completed_by: null })
    .eq("id", task.id)
    .eq("organization_id", organizationId);
  if (error) message(organizationId, "error", completed ? "No se pudo marcar la tarea como realizada." : "No se pudo devolver la tarea a pendientes.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath(`/admin/empresas/${organizationId}/visibilidad`);
  revalidatePath("/app");
  revalidatePath("/app/tareas");
  message(organizationId, "success", completed ? "Tarea operativa realizada y comprobada por Nexaro." : "Tarea operativa devuelta a pendientes.");
}

export async function completeNexaroTask(organizationId: string, taskId: string) {
  return updateNexaroTask(organizationId, taskId, true);
}

export async function reopenNexaroTask(organizationId: string, taskId: string) {
  return updateNexaroTask(organizationId, taskId, false);
}

export async function updateRestaurantRoadmapStep(organizationId: string, stepKey: string, formData: FormData) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) redirect("/admin");
  const template = getRestaurantRoadmapTemplate(stepKey);
  if (!template) message(organizationId, "error", "El paso del plan no es válido.");
  const status = field(formData, "status", 20);
  const allowedStatuses = new Set(["pending", "in_progress", "completed", "cancelled"]);
  if (!allowedStatuses.has(status)) message(organizationId, "error", "El estado seleccionado no es válido.");
  const note = field(formData, "note", 1200);
  const dueDate = field(formData, "dueDate", 10);
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) message(organizationId, "error", "La fecha prevista no es válida.");

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const completed = status === "completed";
  const { error } = await supabase.from("nexaro_tasks").upsert({
    organization_id: organizationId,
    source: "manual",
    source_reference: restaurantTaskReference(template.key),
    title: template.title,
    description: note || null,
    priority: template.priority,
    status,
    due_at: dueDate ? new Date(`${dueDate}T12:00:00.000Z`).toISOString() : null,
    completed_at: completed ? new Date().toISOString() : null,
    created_by: userId,
    completed_by: completed ? userId : null,
  }, { onConflict: "organization_id,source,source_reference" });
  if (error) message(organizationId, "error", "No se pudo actualizar el plan del restaurante.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app");
  revalidatePath("/app/hoja-de-ruta");
  message(organizationId, "success", `Paso «${template.title}» actualizado.`);
}
