import { describe, expect, it } from "vitest";
import { subscriptionGrantsAccess } from "./state";

describe("subscriptionGrantsAccess", () => {
  it.each(["active", "trialing"])("permite el estado %s", (status) => {
    expect(subscriptionGrantsAccess(status)).toBe(true);
  });

  it.each(["past_due", "unpaid", "paused", "canceled", "incomplete"])(
    "suspende el estado %s",
    (status) => expect(subscriptionGrantsAccess(status)).toBe(false),
  );
});
