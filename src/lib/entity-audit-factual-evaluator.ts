import "server-only";

import {
  calculateFactualCost,
  factualClassifications,
  factualFieldKeys,
  parseFactualEvaluationOutput,
  type FactualCostRates,
  type FactualEvaluationOutput,
} from "@/lib/entity-audit-factual-core";

export type FactualEvaluatorRequest = {
  prompt: string;
  responseIds: Set<string>;
  maxOutputTokens: number;
};

export type FactualEvaluatorResult = {
  output: FactualEvaluationOutput;
  model: string;
  inputTokens: number;
  outputTokens: number;
  actualCostUsd: number;
};

export interface FactualEvaluator {
  readonly model: string;
  readonly enabled: boolean;
  evaluate(request: FactualEvaluatorRequest): Promise<FactualEvaluatorResult>;
}

type EvaluatorOptions = {
  apiKey?: string;
  model?: string;
  rates?: FactualCostRates;
  fetchImpl?: typeof fetch;
  executionEnabled?: boolean;
};

function outputText(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as { content: unknown[] }).content : [];
    return content.flatMap((part) => part && typeof part === "object"
      && typeof (part as Record<string, unknown>).text === "string"
      ? [String((part as Record<string, unknown>).text)] : []);
  }).join("\n");
}

export function createOpenAIFactualEvaluator(options: EvaluatorOptions = {}): FactualEvaluator {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.ENTITY_AUDIT_EVALUATOR_MODEL ?? "gpt-5.4-mini";
  const rates = options.rates ?? {
    inputPerMillion: Number(process.env.ENTITY_AUDIT_INPUT_USD_PER_MILLION ?? "0.75"),
    outputPerMillion: Number(process.env.ENTITY_AUDIT_OUTPUT_USD_PER_MILLION ?? "4.5"),
  };
  const fetchImpl = options.fetchImpl ?? fetch;
  const executionEnabled = options.executionEnabled
    ?? process.env.ENTITY_AUDIT_FACTUAL_EXECUTION_ENABLED === "true";

  return {
    model,
    enabled: executionEnabled,
    async evaluate(request) {
      if (!executionEnabled) throw new Error("La ejecución factual pagada todavía no está habilitada.");
      if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");
      const response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(90_000),
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: request.maxOutputTokens,
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: [
                "Extrae sólo afirmaciones factuales explícitas sobre el restaurante de cada respuesta registrada.",
                "Contrasta cada afirmación únicamente con la identidad oficial proporcionada.",
                "Clasifica como correct, incorrect, unverifiable u outdated.",
                "Una omisión no es una afirmación y nunca debe clasificarse automáticamente como incorrecta.",
                "No completes datos ausentes, no uses conocimiento externo y no inventes evidencias.",
                "Usa el mismo finding_key para discrepancias semánticamente equivalentes.",
                "Toda conclusión quedará pendiente de revisión humana.",
              ].join(" ") }],
            },
            { role: "user", content: [{ type: "input_text", text: request.prompt }] },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "entity_audit_factual_evaluation",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["claims"],
                properties: {
                  claims: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["response_id", "assertion", "field_key", "classification", "evidence", "finding_key"],
                      properties: {
                        response_id: { type: "string" },
                        assertion: { type: "string" },
                        field_key: { type: "string", enum: factualFieldKeys },
                        classification: { type: "string", enum: factualClassifications },
                        evidence: { type: "string" },
                        finding_key: { type: ["string", "null"] },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(`OpenAI ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
      const text = outputText(payload);
      if (!text) throw new Error("OpenAI no devolvió una evaluación factual estructurada.");
      const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
      const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
      const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
      return {
        output: parseFactualEvaluationOutput(JSON.parse(text), request.responseIds),
        model: typeof payload.model === "string" ? payload.model : model,
        inputTokens,
        outputTokens,
        actualCostUsd: calculateFactualCost(inputTokens, outputTokens, rates),
      };
    },
  };
}

export const openAIFactualEvaluator = createOpenAIFactualEvaluator();
