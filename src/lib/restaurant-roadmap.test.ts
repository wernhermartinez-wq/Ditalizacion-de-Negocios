import { describe, expect, it } from "vitest";
import { getCurrentRestaurantStep, mergeRestaurantRoadmapTasks, restaurantRoadmapTemplates } from "./restaurant-roadmap";

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
});
