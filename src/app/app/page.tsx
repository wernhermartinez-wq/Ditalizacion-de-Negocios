import type { Metadata } from "next";
import { Dashboard } from "@/components/app/dashboard";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { dimensionScores } from "@/lib/diagnostics";
import { buildRoadmap, roadmapTasks } from "@/lib/roadmap";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Inicio" };
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const questionnaireResult = await supabase
    .from("diagnostic_questionnaires")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  const questionnaireId = questionnaireResult.data?.id;
  if (!questionnaireId) return <Dashboard organizationName={organization.name} diagnostic={null} tasks={[]} />;

  const [questionsResult, diagnosticResult] = await Promise.all([
    supabase.from("diagnostic_questions").select("*").eq("questionnaire_id", questionnaireId).order("position"),
    supabase
      .from("diagnostics")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("questionnaire_id", questionnaireId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const diagnosticRow = diagnosticResult.data;
  const responsesResult = diagnosticRow
    ? await supabase.from("diagnostic_responses").select("*").eq("diagnostic_id", diagnosticRow.id)
    : { data: [], error: null };
  const questions = questionsResult.data ?? [];
  const responses = responsesResult.data ?? [];
  const tasks = diagnosticRow?.status === "completed"
    ? roadmapTasks(buildRoadmap(questions, responses)).slice(0, 3)
    : [];

  return (
    <Dashboard
      organizationName={organization.name}
      tasks={tasks}
      diagnostic={{
        status: diagnosticRow?.status ?? "not_started",
        score: diagnosticRow?.provisional_score ?? null,
        answered: responses.length,
        total: questions.length,
        dimensions: dimensionScores(questions, responses),
      }}
    />
  );
}
