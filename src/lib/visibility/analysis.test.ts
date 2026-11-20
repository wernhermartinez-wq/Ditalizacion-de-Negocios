import { describe, expect, it } from "vitest";
import { analyzeMentions, analyzeVisibilityPlacement, normalizeCitations, normalizeDomain } from "./analysis";

describe("visibility analysis", () => {
  it("detecta marca, competidor y conserva evidencia", () => {
    const text = "Nexaro destaca por su servicio local. Otra opción es Agencia Norte.";
    const result = analyzeMentions(text, [
      { type: "client", name: "Nexaro", variants: ["Nexaro IA"] },
      { type: "competitor", name: "Agencia Norte", variants: [], competitorId: "competitor-1" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ entityType: "client", sentiment: "positive", needsReview: false });
    expect(result[0].evidence).toContain("Nexaro");
    expect(result[1].competitorId).toBe("competitor-1");
  });

  it("normaliza dominios y marca las citas propias", () => {
    expect(normalizeDomain("https://www.nexaro-ia.com/ruta")).toBe("nexaro-ia.com");
    const [citation] = normalizeCitations([{ url: "https://empresas.nexaro-ia.com/prueba" }], "nexaro-ia.com");
    expect(citation.isClientDomain).toBe(true);
  });

  it("distingue posición ordenada y primera mención no ordenada", () => {
    const entities = [
      { type: "client" as const, name: "Pizzería Basilico", variants: ["Basilico"] },
      { type: "competitor" as const, name: "Pizzería Roma", variants: [] },
    ];
    expect(analyzeVisibilityPlacement("1. Pizzería Roma\n2. Pizzería Basilico", entities)).toEqual({
      structure: "ordered", orderedPosition: 2, firstMention: null, clientPresent: true,
    });
    expect(analyzeVisibilityPlacement("Pizzería Basilico destaca. Pizzería Roma también.", entities).firstMention).toBe(true);
    expect(analyzeVisibilityPlacement("Pizzería Roma destaca. Pizzería Basilico también.", entities).firstMention).toBe(false);
  });
});
