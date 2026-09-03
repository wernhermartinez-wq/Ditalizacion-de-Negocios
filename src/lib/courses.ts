import type { Tables } from "@/lib/supabase/database.types";

type Course = Tables<"courses">;
type Competency = Tables<"course_competencies">;

export type CourseWithCompetencies = Course & {
  competencies: Competency[];
};

export function attachCourseCompetencies(courses: Course[], competencies: Competency[]) {
  const byCourse = new Map<string, Competency[]>();
  for (const competency of competencies) {
    const values = byCourse.get(competency.course_id) ?? [];
    values.push(competency);
    byCourse.set(competency.course_id, values);
  }
  return courses.map((course) => ({ ...course, competencies: byCourse.get(course.id) ?? [] }));
}

export function recommendedCourseIds(
  courses: CourseWithCompetencies[],
  dimensionScores: ReadonlyMap<string, number | null>,
) {
  return courses
    .map((course) => {
      const applicableScores = course.competencies
        .map((competency) => dimensionScores.get(competency.dimension_id) ?? null)
        .filter((score): score is number => score !== null);
      const priorityScore = applicableScores.length ? Math.min(...applicableScores) : null;
      return { id: course.id, priorityScore };
    })
    .filter((course): course is { id: string; priorityScore: number } => course.priorityScore !== null)
    .toSorted((left, right) => left.priorityScore - right.priorityScore)
    .map((course) => course.id);
}
