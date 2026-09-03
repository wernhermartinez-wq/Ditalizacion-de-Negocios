"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function coursesMessage(type: "error" | "success", text: string): never {
  redirect(`/app/cursos?${new URLSearchParams({ [type]: text }).toString()}`);
}

async function getContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");
  return { supabase, userId, organization };
}

export async function enrollCourse(formData: FormData) {
  const { supabase, userId, organization } = await getContext();
  const courseId = field(formData, "courseId", 40);
  const assessmentId = field(formData, "assessmentId", 40);
  const reason = field(formData, "reason", 500) || "Curso elegido para reforzar las capacidades digitales de la empresa.";
  if (!UUID_PATTERN.test(courseId)) coursesMessage("error", "El curso seleccionado no es válido.");

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();
  if (courseError || !course) coursesMessage("error", "El curso ya no está disponible.");

  const validAssessmentId = UUID_PATTERN.test(assessmentId) ? assessmentId : null;
  if (validAssessmentId) {
    const { data: assessment, error } = await supabase
      .from("diagnostics")
      .select("id")
      .eq("id", validAssessmentId)
      .eq("organization_id", organization.id)
      .eq("status", "validated")
      .maybeSingle();
    if (error || !assessment) coursesMessage("error", "El diagnóstico asociado no está disponible.");
  }

  const { error } = await supabase.from("course_assignments").insert({
    organization_id: organization.id,
    user_id: userId,
    course_id: course.id,
    assessment_id: validAssessmentId,
    reason,
    status: "assigned",
    assigned_by: userId,
  });
  if (error?.code === "23505") coursesMessage("error", "Este curso ya forma parte de tu itinerario.");
  if (error) coursesMessage("error", "No se pudo añadir el curso al itinerario.");

  revalidatePath("/app/cursos");
  coursesMessage("success", "Curso añadido a tu itinerario.");
}

export async function updateCourseProgress(assignmentId: string, formData: FormData) {
  if (!UUID_PATTERN.test(assignmentId)) coursesMessage("error", "La asignación no es válida.");
  const { supabase } = await getContext();
  const percentage = Number(field(formData, "percentage", 3));
  const evaluation = field(formData, "evaluation", 800);
  const evidence = field(formData, "evidence", 500);
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) coursesMessage("error", "El progreso debe estar entre 0 y 100.");

  const { error } = await supabase.rpc("update_course_progress", {
    p_assignment_id: assignmentId,
    p_percentage: percentage,
    p_evaluation: evaluation || undefined,
    p_evidence: evidence || undefined,
  });
  if (error) coursesMessage("error", "No se pudo actualizar el progreso del curso.");

  revalidatePath("/app/cursos");
  coursesMessage("success", percentage === 100 ? "Curso completado." : "Progreso actualizado.");
}
