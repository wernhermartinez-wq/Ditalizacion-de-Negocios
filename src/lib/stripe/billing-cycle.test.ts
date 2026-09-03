import { describe, expect, it } from "vitest";
import { getNextBillingAnchor } from "./billing-cycle";

describe("getNextBillingAnchor", () => {
  it("ancla al día 15 del mismo mes antes del corte de invierno", () => {
    const result = getNextBillingAnchor(new Date("2026-01-02T12:00:00Z"));
    expect(result).toEqual({
      chargeImmediately: false,
      unix: Date.parse("2026-01-14T23:00:00Z") / 1000,
    });
  });

  it("ancla al siguiente mes después del día 15 y respeta horario de verano", () => {
    const result = getNextBillingAnchor(new Date("2026-03-20T12:00:00Z"));
    expect(result.unix).toBe(Date.parse("2026-04-14T22:00:00Z") / 1000);
    expect(result.chargeImmediately).toBe(false);
  });

  it("cobra inmediatamente durante todo el día 15 de Berlín", () => {
    expect(getNextBillingAnchor(new Date("2026-07-14T22:00:00Z"))).toEqual({
      chargeImmediately: true,
      unix: null,
    });
    expect(getNextBillingAnchor(new Date("2026-07-15T21:59:59Z"))).toEqual({
      chargeImmediately: true,
      unix: null,
    });
  });
});
