import { describe, expect, it, vi } from "vitest";
import type { Tables } from "./supabase/database.types";
import {
  buildFactualEvaluationPrompt,
  buildStoredFactualResult,
  calculateFactualCost,
  estimateFactualEvaluationCost,
  parseFactualEvaluationOutput,
  type FactualSourceResponse,
} from "./entity-audit-factual-core";

vi.mock("server-only", () => ({}));

const identity = {
  id: "64000000-0000-4000-8000-000000000001",
  commercial_name: "Pizzería Basilico",
  legal_name: null,
  name_variants: ["Basilico Valencia"],
  website_url: "https://basilico.test/",
  domain: "basilico.test",
  address_line_1: "Calle Mayor 10",
  address_line_2: null,
  postal_code: "46001",
  city: "Valencia",
  region: "Valencia",
  country_code: "ES",
  phone: "+34960000000",
  opening_hours: { text: "Lunes a domingo, 13:00–23:00" },
  categories: ["Pizzería"],
  specialties: ["Pizza italiana"],
  services: ["Reservas"],
  menu_url: "https://basilico.test/carta",
  reservation_url: "https://basilico.test/reservas",
  contact_url: "https://basilico.test/contacto",
  official_profiles: ["https://instagram.com/basilico"],
} as unknown as Tables<"entity_identity_versions">;

const responses: FactualSourceResponse[] = [
  { id: "71000000-0000-4000-8000-000000000001", provider: "openai", originalResponse: "Basilico está en Calle Falsa 5 y su teléfono es +34960000000." },
  { id: "71000000-0000-4000-8000-000000000002", provider: "gemini", originalResponse: "La dirección de Basilico es Calle Falsa 5. Tiene terraza." },
];

const simulatedOutput = {
  claims: [
    {
      response_id: responses[0].id,
      assertion: "El teléfono es +34960000000.",
      field_key: "phone",
      classification: "correct",
      evidence: "Coincide con el teléfono de la identidad validada.",
      finding_key: null,
    },
    {
      response_id: responses[0].id,
      assertion: "La dirección es Calle Falsa 5.",
      field_key: "address",
      classification: "incorrect",
      evidence: "La identidad validada indica Calle Mayor 10.",
      finding_key: "direccion-incorrecta",
    },
    {
      response_id: responses[1].id,
      assertion: "La dirección es Calle Falsa 5.",
      field_key: "address",
      classification: "incorrect",
      evidence: "La identidad validada indica Calle Mayor 10.",
      finding_key: "direccion-incorrecta",
    },
    {
      response_id: responses[1].id,
      assertion: "El restaurante tiene terraza.",
      field_key: "services",
      classification: "unverifiable",
      evidence: "La identidad validada no confirma ni desmiente una terraza.",
      finding_key: "servicio-terraza-no-verificable",
    },
  ],
};

describe("Entity Audit factual evaluation", () => {
  it("parses simulated Structured Output and groups equivalent discrepancies", () => {
    const parsed = parseFactualEvaluationOutput(simulatedOutput, new Set(responses.map((item) => item.id)));
    const stored = buildStoredFactualResult(parsed, responses, identity);

    expect(stored.claims).toHaveLength(4);
    expect(stored.findings).toHaveLength(2);
    expect(stored.findings.find((finding) => finding.finding_key === "direccion-incorrecta")).toMatchObject({
      classification: "incorrect",
      provider_count: 2,
      response_count: 2,
    });
    expect(stored.claims.find((claim) => claim.field_key === "phone")?.identity_evidence).toMatchObject({
      identity_version_id: identity.id,
      value: identity.phone,
    });
  });

  it("does not create a finding from an omitted identity field", () => {
    const parsed = parseFactualEvaluationOutput({ claims: [] }, new Set(responses.map((item) => item.id)));
    expect(buildStoredFactualResult(parsed, responses, identity)).toEqual({ claims: [], findings: [] });
  });

  it("rejects claims that do not belong to the recorded responses", () => {
    expect(() => parseFactualEvaluationOutput({ claims: [{ ...simulatedOutput.claims[0], response_id: "unknown" }] }, new Set(responses.map((item) => item.id))))
      .toThrow("no cumple el contrato factual");
  });

  it("estimates cost without presenting it as actual consumption", () => {
    const prompt = buildFactualEvaluationPrompt(identity, responses);
    const estimate = estimateFactualEvaluationCost(prompt, responses.length, { inputPerMillion: 1, outputPerMillion: 2 });
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.outputTokens).toBe(1200);
    expect(estimate.estimatedUsd).toBe(calculateFactualCost(estimate.inputTokens, 1200, { inputPerMillion: 1, outputPerMillion: 2 }));
  });

  it("uses Structured Outputs with a simulated OpenAI response and no search tools", async () => {
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.store).toBe(false);
      expect(body).not.toHaveProperty("tools");
      expect(body.text).toMatchObject({ format: { type: "json_schema", strict: true } });
      return new Response(JSON.stringify({
        model: "gpt-5.4-mini-test",
        output: [{ content: [{ type: "output_text", text: JSON.stringify(simulatedOutput) }] }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const { createOpenAIFactualEvaluator } = await import("./entity-audit-factual-evaluator");
    const evaluator = createOpenAIFactualEvaluator({
      apiKey: "test-only",
      executionEnabled: true,
      fetchImpl: fetchImpl as typeof fetch,
      rates: { inputPerMillion: 1, outputPerMillion: 2 },
    });
    const result = await evaluator.evaluate({
      prompt: buildFactualEvaluationPrompt(identity, responses),
      responseIds: new Set(responses.map((item) => item.id)),
      maxOutputTokens: 1200,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.output.claims).toHaveLength(4);
    expect(result.actualCostUsd).toBe(0.002);
  });

  it("keeps real execution disabled without calling the provider", async () => {
    const fetchImpl = vi.fn();
    const { createOpenAIFactualEvaluator } = await import("./entity-audit-factual-evaluator");
    const evaluator = createOpenAIFactualEvaluator({ apiKey: "test-only", executionEnabled: false, fetchImpl: fetchImpl as typeof fetch });
    await expect(evaluator.evaluate({ prompt: "{}", responseIds: new Set(), maxOutputTokens: 100 }))
      .rejects.toThrow("todavía no está habilitada");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
