import { describe, expect, it } from "vitest";
import { interventionProposalFromForm, proposalReviewFromForm } from "./entity-audit-proposals";

describe("Entity Audit intervention proposals", () => {
  it("keeps verified facts, hypotheses and recommendations separate", () => {
    const form = new FormData();
    form.append("findingId", "89000000-0000-4000-8000-000000000001");
    form.set("phase", "3");
    form.set("verifiedProblem", "Dos respuestas muestran una dirección distinta de la identidad validada.");
    form.set("hypothesis", "Un directorio antiguo podría estar propagando el dato.");
    form.set("suggestedAction", "Revisar y corregir las fuentes propias y los directorios identificados.");
    form.set("expectedResult", "Las fuentes controladas muestran la dirección validada.");
    const value = interventionProposalFromForm(form);
    expect(value).toMatchObject({ phase: 3, findingIds: ["89000000-0000-4000-8000-000000000001"] });
    expect(value.verifiedProblem).not.toBe(value.hypothesis);
    expect(value.suggestedAction).not.toBe(value.expectedResult);
  });

  it("requires a confirmed finding selection and an existing phase", () => {
    const form = new FormData();
    form.append("findingId", "89000000-0000-4000-8000-000000000001");
    form.set("phase", "8");
    expect(() => interventionProposalFromForm(form)).toThrow("fase");
  });

  it("requires an explicit client summary before authorizing visibility", () => {
    const form = new FormData();
    form.set("reviewStatus", "approved");
    form.set("clientVisible", "on");
    expect(() => proposalReviewFromForm(form)).toThrow("resumen autorizado");
    form.set("clientSummary", "Nexaro revisará la coherencia de la dirección publicada.");
    expect(proposalReviewFromForm(form)).toMatchObject({ reviewStatus: "approved", clientVisible: true });
  });

  it("never exposes a dismissed proposal", () => {
    const form = new FormData();
    form.set("reviewStatus", "dismissed");
    form.set("clientVisible", "on");
    form.set("clientSummary", "No debe mostrarse.");
    expect(proposalReviewFromForm(form)).toEqual({ reviewStatus: "dismissed", clientVisible: false, clientSummary: null });
  });
});
