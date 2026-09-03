import type { Metadata } from "next";
import { BookOpen, CheckCircle2, Clock3, GraduationCap, PlayCircle, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { attachCourseCompetencies, recommendedCourseIds } from "@/lib/courses";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { enrollCourse, updateCourseProgress } from "./actions";

export const metadata: Metadata = { title: "Cursos" };

type PageProps = { searchParams: Promise<{ error?: string; success?: string }> };

const levelLabels: Record<string, string> = { introductory: "Inicial", intermediate: "Intermedio", advanced: "Avanzado" };
const modalityLabels: Record<string, string> = { self_paced: "A tu ritmo", live: "En directo", blended: "Mixto" };

export default async function CoursesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const assignmentsPromise = supabase.from("course_assignments").select("*").eq("organization_id", organization.id).eq("user_id", userId).order("created_at", { ascending: false });
  const [coursesResult, competenciesResult, assignmentsResult, diagnosticResult, params] = await Promise.all([
    supabase.from("courses").select("*").eq("status", "published").order("title"),
    supabase.from("course_competencies").select("*"),
    assignmentsPromise,
    supabase.from("diagnostics").select("id, validated_at").eq("organization_id", organization.id).eq("status", "validated").order("validated_at", { ascending: false }).limit(1).maybeSingle(),
    searchParams,
  ]);
  if (coursesResult.error || competenciesResult.error || assignmentsResult.error || diagnosticResult.error) throw new Error("No se pudo cargar el itinerario formativo.");

  const assignments = assignmentsResult.data ?? [];
  const [scoresResult, progressResult] = await Promise.all([
    diagnosticResult.data ? supabase.from("assessment_scores").select("dimension_id, score").eq("assessment_id", diagnosticResult.data.id) : Promise.resolve({ data: [], error: null }),
    assignments.length ? supabase.from("course_progress").select("*").in("assignment_id", assignments.map((assignment) => assignment.id)) : Promise.resolve({ data: [], error: null }),
  ]);
  if (scoresResult.error || progressResult.error) throw new Error("No se pudo cargar el progreso formativo.");

  const courses = attachCourseCompetencies(coursesResult.data ?? [], competenciesResult.data ?? []);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const assignmentByCourse = new Map(assignments.map((assignment) => [assignment.course_id, assignment]));
  const progressByAssignment = new Map((progressResult.data ?? []).map((progress) => [progress.assignment_id, progress]));
  const scores = new Map((scoresResult.data ?? []).map((score) => [score.dimension_id, score.score]));
  const recommendations = new Set(recommendedCourseIds(courses, scores).slice(0, 3));
  const itinerary = assignments.flatMap((assignment) => {
    const course = courseById.get(assignment.course_id);
    return course ? [{ assignment, course, progress: progressByAssignment.get(assignment.id) }] : [];
  });
  const completed = itinerary.filter(({ progress }) => progress?.percentage === 100).length;
  const averageProgress = itinerary.length ? Math.round(itinerary.reduce((sum, item) => sum + (item.progress?.percentage ?? 0), 0) / itinerary.length) : 0;

  return (
    <main className="page-content courses-page">
      <div className="page-heading courses-heading">
        <div><p className="eyebrow">Capacidades digitales</p><h1>Aprender lo que tu hoja de ruta necesita.</h1><p className="page-description">El catálogo se prioriza con las brechas del último diagnóstico validado, sin inventar recomendaciones cuando aún no existe uno.</p></div>
        <span className="real-data-badge"><GraduationCap size={16} /> {itinerary.length} en tu itinerario</span>
      </div>
      <AuthMessage error={params.error} success={params.success} />

      <section className="learning-strip">
        <article><span>Progreso medio</span><strong>{averageProgress}%</strong><div><i style={{ width: `${averageProgress}%` }} /></div></article>
        <article><span>Completados</span><strong>{completed}<small> / {itinerary.length}</small></strong></article>
        <article><span>Origen de recomendaciones</span><strong>{diagnosticResult.data ? "Diagnóstico validado" : "Catálogo general"}</strong></article>
      </section>

      <section className="course-section">
        <div className="course-section-heading"><div><p className="eyebrow">Tu recorrido</p><h2>Itinerario activo</h2></div><span>{itinerary.length} cursos</span></div>
        {itinerary.length ? <div className="course-itinerary">{itinerary.map(({ assignment, course, progress }, index) => {
          const percentage = progress?.percentage ?? 0;
          return <article className="card assigned-course" key={assignment.id}>
            <div className="course-sequence"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
            <div className="assigned-course-main"><header><div><small>{levelLabels[course.level]} · {modalityLabels[course.modality]}</small><h3>{course.title}</h3></div>{percentage === 100 ? <CheckCircle2 className="course-complete-icon" size={23} /> : <span className="course-percent">{percentage}%</span>}</header><p>{assignment.reason}</p><div className="course-progress-track"><i style={{ width: `${percentage}%` }} /></div>
              <form action={updateCourseProgress.bind(null, assignment.id)} className="course-progress-form">
                <label>Progreso<select name="percentage" defaultValue={percentage}><option value="0">0% · Pendiente</option><option value="25">25% · Primer bloque</option><option value="50">50% · Mitad</option><option value="75">75% · Último tramo</option><option value="100">100% · Completado</option></select></label>
                <label>Aprendizaje clave<input name="evaluation" maxLength={800} defaultValue={progress?.evaluation ?? ""} placeholder="Qué vas a aplicar" /></label>
                <label>Evidencia<input name="evidence" maxLength={500} defaultValue={progress?.evidence ?? ""} placeholder="Enlace o referencia opcional" /></label>
                <button type="submit">Guardar progreso</button>
              </form>
            </div>
          </article>;
        })}</div> : <div className="card course-empty"><BookOpen size={28} /><h3>Tu itinerario empieza con una decisión.</h3><p>Elige un curso del catálogo. Cuando exista un diagnóstico validado, destacaremos primero los que responden a tus brechas.</p></div>}
      </section>

      <section className="course-section">
        <div className="course-section-heading"><div><p className="eyebrow">Catálogo Nexaro</p><h2>Formación disponible</h2></div><span>{courses.length} cursos</span></div>
        <div className="course-catalog">{courses.map((course) => {
          const assigned = assignmentByCourse.has(course.id);
          const recommended = recommendations.has(course.id);
          return <article className={`card course-card ${recommended ? "recommended" : ""}`} key={course.id}>
            <header>{recommended ? <span className="recommendation-label"><Sparkles size={13} /> Recomendada</span> : <span className="catalog-label">Catálogo</span>}<span><Clock3 size={14} /> {course.duration_minutes} min</span></header>
            <div className="course-icon"><PlayCircle size={22} /></div>
            <small>{levelLabels[course.level]} · {modalityLabels[course.modality]}</small>
            <h3>{course.title}</h3><p>{course.summary}</p>
            <div className="course-competencies">{course.competencies.map((competency) => <span key={`${competency.dimension_id}-${competency.competency}`}>{competency.competency}</span>)}</div>
            {assigned ? <span className="course-added"><CheckCircle2 size={15} /> En tu itinerario</span> : <form action={enrollCourse}><input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="assessmentId" value={diagnosticResult.data?.id ?? ""} /><input type="hidden" name="reason" value={recommended ? "Recomendado para reforzar una de las dimensiones con menor puntuación en el último diagnóstico validado." : "Curso elegido desde el catálogo de formación de Nexaro."} /><SubmitButton pendingLabel="Añadiendo…">Añadir al itinerario</SubmitButton></form>}
          </article>;
        })}</div>
      </section>
    </main>
  );
}
