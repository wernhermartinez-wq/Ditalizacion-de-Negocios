import { describe, expect, it } from "vitest";
import { assignedRestaurantRoadmapSteps, getCurrentRestaurantStep, getRestaurantRoadmapProgress, mergeRestaurantRoadmapTasks, restaurantImplementationStages, restaurantRoadmapStages, restaurantRoadmapTemplates } from "./restaurant-roadmap";

describe("restaurant roadmap", () => {
  it("creates a pending roadmap when there are no stored tasks", () => {
    const steps = mergeRestaurantRoadmapTasks([]);
    expect(steps).toHaveLength(restaurantRoadmapTemplates.length);
    expect(steps.every((step) => step.status === "pending")).toBe(true);
    expect(getCurrentRestaurantStep(steps)?.key).toBe("local_baseline");
  });

  it("prioritizes an in-progress step as the current one", () => {
    const task = {
      source_reference: "restaurant:google_profile",
      status: "in_progress",
      description: "Validando fotografías",
      due_at: null,
      completed_at: null,
    } as Parameters<typeof mergeRestaurantRoadmapTasks>[0][number];
    const steps = mergeRestaurantRoadmapTasks([task]);
    expect(getCurrentRestaurantStep(steps)?.key).toBe("google_profile");
    expect(steps.find((step) => step.key === "google_profile")?.note).toBe("Validando fotografías");
  });

  it("only exposes steps that Nexaro assigned to the restaurant", () => {
    const task = {
      source_reference: "restaurant:google_profile",
      status: "pending",
      description: null,
      due_at: null,
      completed_at: null,
    } as Parameters<typeof assignedRestaurantRoadmapSteps>[0][number];
    const steps = assignedRestaurantRoadmapSteps([task]);
    expect(steps).toHaveLength(1);
    expect(steps[0].key).toBe("google_profile");
  });

  it("keeps the agreed seven phases and ordered lettered subtasks", () => {
    expect(restaurantRoadmapStages).toHaveLength(7);
    expect(restaurantRoadmapTemplates.map((step) => step.code)).toEqual([
      "1A", "1B", "1C",
      "2A", "2B", "2C", "2D", "2E",
      "3A", "3B", "3C", "3D",
      "4A", "4B", "4C", "4D", "4E", "4F",
      "5A", "5B", "5C", "5D", "5E", "5F", "5G",
      "6A", "6B", "6C", "6D", "6E", "6F",
      "7A", "7B", "7C", "7D", "7E",
    ]);
    expect(new Set(restaurantRoadmapTemplates.map((step) => step.key)).size).toBe(restaurantRoadmapTemplates.length);
    expect(restaurantRoadmapTemplates.find((step) => step.key === "nfc_table")?.stage).toBe(5);
    expect(restaurantRoadmapTemplates.find((step) => step.key === "nfc_checkout")?.stage).toBe(6);
  });

  it("uses the six implementation phases as 100 percent and keeps phase seven recurrent", () => {
    expect(restaurantImplementationStages.map((stage) => stage.stage)).toEqual([1, 2, 3, 4, 5, 6]);
    const storedTasks = restaurantRoadmapTemplates
      .filter((template) => template.stage <= 6)
      .map((template) => ({
        source_reference: `restaurant:${template.key}`,
        status: "completed",
        description: null,
        due_at: null,
        completed_at: "2026-10-11T12:00:00.000Z",
      })) as Parameters<typeof assignedRestaurantRoadmapSteps>[0];
    const progress = getRestaurantRoadmapProgress(assignedRestaurantRoadmapSteps(storedTasks));
    expect(progress).toMatchObject({ completedStages: 6, totalStages: 6, percentage: 100, implementationComplete: true });
  });

  it("does not count an unassigned phase as completed", () => {
    const oneCompletedTask = [{
      source_reference: "restaurant:local_baseline",
      status: "completed",
      description: null,
      due_at: null,
      completed_at: "2026-10-11T12:00:00.000Z",
    }] as Parameters<typeof assignedRestaurantRoadmapSteps>[0];
    const progress = getRestaurantRoadmapProgress(assignedRestaurantRoadmapSteps(oneCompletedTask));
    expect(progress).toMatchObject({ completedStages: 1, percentage: 17, implementationComplete: false });
  });
});
