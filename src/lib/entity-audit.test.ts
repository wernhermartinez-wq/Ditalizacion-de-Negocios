import { describe, expect, it } from "vitest";
import { canStartInitialEntityAudit, domainFromUrl, identityDraftFromForm, normalizeUrl, splitList } from "./entity-audit-core";

describe("Entity Audit identity helpers", () => {
  it("normalizes URLs and domains", () => {
    expect(normalizeUrl("www.basilico.es")).toBe("https://www.basilico.es/");
    expect(domainFromUrl("https://www.basilico.es/carta")).toBe("basilico.es");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("deduplicates declared lists", () => {
    expect(splitList("Pizzería, Italiano\nPizzería")).toEqual(["Pizzería", "Italiano"]);
  });

  it("blocks an initial audit until the official identity is validated", () => {
    expect(canStartInitialEntityAudit("identity_pending", "draft")).toBe(false);
    expect(canStartInitialEntityAudit("ready", "draft")).toBe(false);
    expect(canStartInitialEntityAudit("ready", "validated")).toBe(true);
  });

  it("builds a normalized identity draft from administrative input", () => {
    const form = new FormData();
    form.set("commercialName", "  Pizzería Basilico  ");
    form.set("websiteUrl", "basilico.example/carta");
    form.set("countryCode", "es");
    form.set("categories", "Pizzería, Restaurante");
    form.set("officialProfiles", "instagram.com/basilico\nhttps://maps.example/basilico");

    const draft = identityDraftFromForm(form);
    expect(draft.commercialName).toBe("Pizzería Basilico");
    expect(draft.domain).toBe("basilico.example");
    expect(draft.countryCode).toBe("ES");
    expect(draft.categories).toEqual(["Pizzería", "Restaurante"]);
    expect(draft.officialProfiles).toEqual([
      "https://instagram.com/basilico",
      "https://maps.example/basilico",
    ]);
  });
});
