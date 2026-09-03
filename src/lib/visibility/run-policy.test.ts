import { describe, expect, it } from "vitest";
import { determineRunStatus, isDuplicateRunError } from "./run-policy";

describe("visibility run policy", () => {
  it("reconoce la restricción única que evita una ejecución duplicada", () => {
    expect(isDuplicateRunError({ code: "23505" })).toBe(true);
    expect(isDuplicateRunError({ code: "42501" })).toBe(false);
  });

  it("conserva un resultado parcial cuando solo falla un proveedor", () => {
    expect(determineRunStatus(2, 1)).toBe("partial");
    expect(determineRunStatus(3, 0)).toBe("completed");
    expect(determineRunStatus(0, 3)).toBe("failed");
  });
});
