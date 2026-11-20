import { describe, expect, it } from "vitest";
import {
  gracePeriodEnd,
  hasBillingAccess,
  isDuplicateActiveSubscription,
  isNexaroAccompanimentSubscription,
  isOlderStripeEvent,
  isStaleInactiveReplacement,
  isStaleProcessingEvent,
  nextPastDueSince,
  parseGraceDays,
  subscriptionGrantsAccess,
} from "./state";

describe("subscriptionGrantsAccess", () => {
  it("permite una suscripción activa", () => {
    expect(subscriptionGrantsAccess("active")).toBe(true);
  });

  it("sólo permite trialing cuando el acompañamiento de prueba está habilitado", () => {
    expect(subscriptionGrantsAccess("trialing")).toBe(false);
    expect(subscriptionGrantsAccess("trialing", true)).toBe(true);
  });

  it.each(["past_due", "unpaid", "paused", "canceled", "incomplete", "incomplete_expired"])(
    "suspende el estado %s",
    (status) => expect(subscriptionGrantsAccess(status, true)).toBe(false),
  );

  it("exige el Price de acompañamiento tanto en metadata como en los items", () => {
    expect(isNexaroAccompanimentSubscription(["price_nexaro"], "price_nexaro", "price_nexaro")).toBe(true);
    expect(isNexaroAccompanimentSubscription(["price_otro"], "price_nexaro", "price_nexaro")).toBe(false);
    expect(isNexaroAccompanimentSubscription(["price_nexaro"], "price_nexaro", "price_otro")).toBe(false);
  });

  it("ignora eventos anteriores pero admite reintentos del mismo segundo", () => {
    expect(isOlderStripeEvent(200, 199)).toBe(true);
    expect(isOlderStripeEvent(200, 200)).toBe(false);
    expect(isOlderStripeEvent(200, 201)).toBe(false);
  });

  it("reintenta un evento atascado en processing pero respeta uno en curso", () => {
    const now = Date.parse("2026-11-20T12:00:00Z");
    expect(isStaleProcessingEvent("2026-11-20T11:59:00Z", now)).toBe(false);
    expect(isStaleProcessingEvent("2026-11-20T11:50:00Z", now)).toBe(true);
    expect(isStaleProcessingEvent(null, now)).toBe(true);
  });

  it("detecta una segunda suscripción activa como duplicada", () => {
    expect(isDuplicateActiveSubscription("sub_a", true, "sub_b", true)).toBe(true);
    expect(isDuplicateActiveSubscription("sub_a", true, "sub_a", true)).toBe(false);
    expect(isDuplicateActiveSubscription("sub_a", false, "sub_b", true)).toBe(false);
    expect(isDuplicateActiveSubscription(null, null, "sub_b", true)).toBe(false);
    expect(isDuplicateActiveSubscription("sub_a", true, "sub_b", false)).toBe(false);
  });

  it("interpreta los días de gracia con un valor por defecto y límites", () => {
    expect(parseGraceDays(undefined)).toBe(7);
    expect(parseGraceDays("")).toBe(7);
    expect(parseGraceDays("abc")).toBe(7);
    expect(parseGraceDays("3")).toBe(3);
    expect(parseGraceDays("0")).toBe(0);
    expect(parseGraceDays("-2")).toBe(0);
    expect(parseGraceDays("90")).toBe(30);
  });

  it("registra el inicio del impago solo mientras siga en past_due", () => {
    expect(nextPastDueSince("past_due", null, 1794697311)).toBe("2026-11-14T23:01:51.000Z");
    expect(nextPastDueSince("past_due", "2026-11-15T00:01:51.000Z", 1794800000)).toBe("2026-11-15T00:01:51.000Z");
    expect(nextPastDueSince("active", "2026-11-15T00:01:51.000Z", 1794834116)).toBeNull();
  });

  it("mantiene el acceso durante la gracia y lo retira al terminar", () => {
    const since = "2026-11-15T00:01:51.000Z";
    const day = 24 * 60 * 60 * 1000;
    const start = Date.parse(since);
    const pastDue = { access_enabled: false, status: "past_due", past_due_since: since };
    expect(hasBillingAccess(pastDue, 7, start + 2 * day)).toBe(true);
    expect(hasBillingAccess(pastDue, 7, start + 8 * day)).toBe(false);
    expect(hasBillingAccess(pastDue, 0, start + 1000)).toBe(false);
    expect(hasBillingAccess({ ...pastDue, past_due_since: null }, 7, start)).toBe(false);
    expect(hasBillingAccess({ ...pastDue, status: "unpaid" }, 7, start + day)).toBe(false);
    expect(hasBillingAccess({ access_enabled: true, status: "active" }, 7, start)).toBe(true);
    expect(hasBillingAccess(null, 7, start)).toBe(false);
    expect(gracePeriodEnd(since, 7)).toBe("2026-11-22T00:01:51.000Z");
  });

  it("una cancelación tardía de una suscripción anterior no desactiva la vigente", () => {
    expect(isStaleInactiveReplacement("sub_nueva", true, "sub_antigua", false)).toBe(true);
    expect(isStaleInactiveReplacement("sub_nueva", false, "sub_antigua", false)).toBe(false);
    expect(isStaleInactiveReplacement("sub_nueva", true, "sub_nueva", false)).toBe(false);
  });
});
