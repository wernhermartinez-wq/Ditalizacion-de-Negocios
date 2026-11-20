import { describe, expect, it } from "vitest";
import { assertVisibilityQueryBudget, determineRunStatus, isDuplicateRunError } from "./run-policy";

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

  it("bloquea una campaña antes de superar sus 45 consultas", () => {
    expect(assertVisibilityQueryBudget(15, 3, 45)).toBe(45);
    expect(() => assertVisibilityQueryBudget(16, 3, 45)).toThrow("presupuesto de 45 consultas");
    expect(() => assertVisibilityQueryBudget(15, 4, 45)).toThrow("presupuesto de 45 consultas");
    expect(() => assertVisibilityQueryBudget(10, 3, 20)).toThrow("presupuesto de 20 consultas");
  });
});
