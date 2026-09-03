import { describe, expect, it } from "vitest";
import { recommendedCourseIds, type CourseWithCompetencies } from "@/lib/courses";

const baseCourse = {
  created_at: "2026-01-01T00:00:00.000Z",
  duration_minutes: 60,
  level: "introductory",
  modality: "self_paced",
  provider: "Nexaro",
  status: "published",
  summary: "Resumen suficientemente largo",
  title: "Curso",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("recommendedCourseIds", () => {
  it("prioritizes courses associated with the weakest applicable dimension", () => {
    const courses = [
      {
        ...baseCourse,
        id: "strategy-course",
        slug: "strategy-course",
        competencies: [{ course_id: "strategy-course", dimension_id: "strategy_enablement", competency: "Estrategia", created_at: baseCourse.created_at }],
      },
      {
        ...baseCourse,
        id: "sales-course",
        slug: "sales-course",
        competencies: [{ course_id: "sales-course", dimension_id: "sales_funnel", competency: "Ventas", created_at: baseCourse.created_at }],
      },
    ] satisfies CourseWithCompetencies[];

    expect(recommendedCourseIds(courses, new Map([
      ["strategy_enablement", 70],
      ["sales_funnel", 20],
    ]))).toEqual(["sales-course", "strategy-course"]);
  });

  it("omits courses whose dimensions were not evaluated", () => {
    const courses = [{
      ...baseCourse,
      id: "course",
      slug: "course",
      competencies: [{ course_id: "course", dimension_id: "data_automation", competency: "Datos", created_at: baseCourse.created_at }],
    }] satisfies CourseWithCompetencies[];

    expect(recommendedCourseIds(courses, new Map([["data_automation", null]]))).toEqual([]);
  });
});
