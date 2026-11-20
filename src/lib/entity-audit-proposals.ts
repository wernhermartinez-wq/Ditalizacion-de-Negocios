export const proposalReviewStatuses = ["draft", "approved", "dismissed"] as const;
export type ProposalReviewStatus = (typeof proposalReviewStatuses)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string, maximum: number, required = false) {
  const value = String(formData.get(key) ?? "").trim();
  if ((required && value.length < 3) || value.length > maximum) {
    throw new Error(`El campo ${key} no es válido.`);
  }
  return value || null;
}

export function interventionProposalContentFromForm(formData: FormData) {
  const phase = Number(formData.get("phase"));
  if (!Number.isInteger(phase) || phase < 1 || phase > 7) throw new Error("La fase seleccionada no es válida.");
  return {
    phase,
    verifiedProblem: text(formData, "verifiedProblem", 2000, true) as string,
    hypothesis: text(formData, "hypothesis", 2000),
    suggestedAction: text(formData, "suggestedAction", 2000, true) as string,
    expectedResult: text(formData, "expectedResult", 2000, true) as string,
    internalNote: text(formData, "internalNote", 2000),
  };
}

export function interventionProposalFromForm(formData: FormData) {
  const findingIds = [...new Set(formData.getAll("findingId").map(String))];
  if (!findingIds.length || findingIds.some((id) => !UUID.test(id))) {
    throw new Error("Selecciona al menos un hallazgo confirmado.");
  }
  return { ...interventionProposalContentFromForm(formData), findingIds };
}

export function proposalReviewFromForm(formData: FormData) {
  const reviewStatus = String(formData.get("reviewStatus") ?? "");
  if (!proposalReviewStatuses.includes(reviewStatus as ProposalReviewStatus) || reviewStatus === "draft") {
    throw new Error("La decisión de revisión no es válida.");
  }
  const clientVisible = reviewStatus === "approved" && formData.get("clientVisible") === "on";
  const clientSummary = reviewStatus === "approved" ? text(formData, "clientSummary", 2000) : null;
  if (clientVisible && !clientSummary) throw new Error("Escribe el resumen autorizado para el restaurante.");
  return { reviewStatus: reviewStatus as Exclude<ProposalReviewStatus, "draft">, clientVisible, clientSummary };
}
