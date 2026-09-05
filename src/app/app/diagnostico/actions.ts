"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  channelAttributionJson,
  isQuestionVisible,
  normalizeChannelAttributionDetails,
  scoreChannelAttribution,
  scoreValues,
} from "@/lib/diagnostics";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

function diagnosticMessage(type: "error" | "success", text: string): never {
  redirect(`/app/diagnostico?${new URLSearchParams({ [type]: text }).toString()}`);
}

export async function reopenDiagnostic() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");

  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const { data: questionnaire, error: questionnaireError } = await supabase
    .from("diagnostic_questionnaires")
    .select("id")
    .eq("is_active", true)
    .single();
  if (questionnaireError || !questionnaire) diagnosticMessage("error", "No se pudo cargar el cuestionario activo.");

  const { data: diagnostic, error } = await supabase
    .from("diagnostics")
    .update({
      status: "draft",
      provisional_score: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organization.id)
    .eq("questionnaire_id", questionnaire.id)
    .eq("status", "completed")
    .select("id")
    .maybeSingle();

  if (error || !diagnostic) {
    diagnosticMessage("error", "El diagnóstico ya no está pendiente de validación y no puede corregirse.");
  }

  revalidatePath("/app");
  revalidatePath("/app/diagnostico");
  revalidatePath("/app/hoja-de-ruta");
  revalidatePath("/app/tareas");
  diagnosticMessage("success", "Diagnóstico abierto para corrección. Tus respuestas anteriores se han conservado.");
}

export async function saveDiagnostic(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");

  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const { data: questionnaire, error: questionnaireError } = await supabase
    .from("diagnostic_questionnaires")
    .select("id")
    .eq("is_active", true)
    .single();
  if (questionnaireError || !questionnaire) diagnosticMessage("error", "No se pudo cargar el cuestionario activo.");

  const { data: questions, error: questionsError } = await supabase
    .from("diagnostic_questions")
    .select("id, required, dimension, dependency_mode, response_type")
    .eq("questionnaire_id", questionnaire.id)
    .order("position");
  if (questionsError || !questions?.length) diagnosticMessage("error", "No se pudieron validar las preguntas.");

  const { data: dependencies, error: dependenciesError } = await supabase
    .from("diagnostic_question_dependencies")
    .select("*")
    .in("child_question_id", questions.map((question) => question.id));
  if (dependenciesError) diagnosticMessage("error", "No se pudieron validar las preguntas condicionales.");

  const submittedAnswers = questions.flatMap((question) => {
    if (question.response_type === "channel_attribution") {
      const details = normalizeChannelAttributionDetails({
        usedChannels: formData.getAll(`channels_used_${question.id}`),
        provenChannels: formData.getAll(`channels_proven_${question.id}`),
        tracksPerformance: formData.get(`channels_measured_${question.id}`) === "true",
        unknownChannels: formData.get(`channels_unknown_${question.id}`) === "true",
      });
      const value = scoreChannelAttribution(details);
      if (value === null) return [];
      return [{ questionId: question.id, dimension: question.dimension, value, details: channelAttributionJson(details) }];
    }

    const rawValue = formData.get(`question_${question.id}`);
    if (typeof rawValue !== "string" || !/^[0-5]$/.test(rawValue)) return [];
    return [{ questionId: question.id, dimension: question.dimension, value: Number(rawValue), details: {} }];
  });
  const submittedMap = new Map(submittedAnswers.map((answer) => [answer.questionId, answer.value]));
  const visibleQuestions = questions.filter((question) => isQuestionVisible(question, dependencies ?? [], submittedMap));
  const visibleIds = new Set(visibleQuestions.map((question) => question.id));
  const answers = submittedAnswers.filter((answer) => visibleIds.has(answer.questionId));
  const intent = formData.get("intent") === "complete" ? "complete" : "save";
  const requiredQuestions = visibleQuestions.filter((question) => question.required);
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const missingRequired = requiredQuestions.filter((question) => !answeredIds.has(question.id)).length;

  if (intent === "complete" && missingRequired) {
    diagnosticMessage("error", `Faltan ${missingRequired} respuestas aplicables para finalizar el diagnóstico.`);
  }
  if (!answers.length) diagnosticMessage("error", "Responde al menos una pregunta antes de guardar.");

  let { data: diagnostic, error: diagnosticError } = await supabase
    .from("diagnostics")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("questionnaire_id", questionnaire.id)
    .eq("status", "draft")
    .maybeSingle();

  if (diagnosticError) diagnosticMessage("error", "No se pudo recuperar el borrador.");
  if (!diagnostic) {
    const created = await supabase
      .from("diagnostics")
      .insert({ organization_id: organization.id, questionnaire_id: questionnaire.id, started_by: userId })
      .select("id")
      .single();
    diagnostic = created.data;
    diagnosticError = created.error;
  }
  if (diagnosticError || !diagnostic) diagnosticMessage("error", "No se pudo crear el diagnóstico.");

  const { data: existing, error: existingError } = await supabase
    .from("diagnostic_responses")
    .select("question_id")
    .eq("diagnostic_id", diagnostic.id);
  if (existingError) diagnosticMessage("error", "No se pudieron comprobar las respuestas guardadas.");

  const existingIds = new Set(existing?.map((response) => response.question_id));
  const newAnswers = answers.filter((answer) => !existingIds.has(answer.questionId));
  const changedAnswers = answers.filter((answer) => existingIds.has(answer.questionId));

  if (newAnswers.length) {
    const { error } = await supabase.from("diagnostic_responses").insert(
      newAnswers.map((answer) => ({
        diagnostic_id: diagnostic.id,
        question_id: answer.questionId,
        value: answer.value,
        details: answer.details,
        answered_by: userId,
      })),
    );
    if (error) diagnosticMessage("error", "No se pudieron guardar las respuestas nuevas.");
  }

  const updateResults = await Promise.all(
    changedAnswers.map((answer) =>
      supabase
        .from("diagnostic_responses")
        .update({ value: answer.value, details: answer.details, answered_by: userId, updated_at: new Date().toISOString() })
        .eq("diagnostic_id", diagnostic.id)
        .eq("question_id", answer.questionId),
    ),
  );
  if (updateResults.some((result) => result.error)) diagnosticMessage("error", "No se pudieron actualizar todas las respuestas.");

  const hiddenExistingIds = [...existingIds].filter((questionId) => !visibleIds.has(questionId));
  if (hiddenExistingIds.length) {
    const { error } = await supabase
      .from("diagnostic_responses")
      .update({ value: 0, details: {}, answered_by: userId, updated_at: new Date().toISOString() })
      .eq("diagnostic_id", diagnostic.id)
      .in("question_id", hiddenExistingIds);
    if (error) diagnosticMessage("error", "No se pudieron excluir las respuestas que dejaron de aplicar.");
  }

  if (intent === "complete") {
    const provisionalScore = scoreValues(answers.map((answer) => answer.value));
    const { error } = await supabase
      .from("diagnostics")
      .update({ status: "completed", provisional_score: provisionalScore, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", diagnostic.id)
      .eq("status", "draft");
    if (error) diagnosticMessage("error", "Las respuestas se guardaron, pero no se pudo finalizar el diagnóstico.");
  }

  revalidatePath("/app");
  revalidatePath("/app/diagnostico");
  revalidatePath("/app/hoja-de-ruta");
  diagnosticMessage("success", intent === "complete" ? "Diagnóstico enviado. Nexaro revisará el resultado antes de validarlo." : "Borrador guardado correctamente.");
}
