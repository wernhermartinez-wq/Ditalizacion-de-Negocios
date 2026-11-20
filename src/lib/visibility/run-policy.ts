export function isDuplicateRunError(error: { code?: string } | null) {
  return error?.code === "23505";
}

export function determineRunStatus(completedProviders: number, failedProviders: number) {
  return completedProviders === 0 ? "failed" as const : failedProviders > 0 ? "partial" as const : "completed" as const;
}

export function assertVisibilityQueryBudget(
  promptCount: number,
  providerCount: number,
  configuredBudget = 45,
) {
  const maximum = Math.min(configuredBudget, 45);
  const plannedQueries = promptCount * providerCount;

  if (!Number.isInteger(promptCount) || promptCount < 1
    || !Number.isInteger(providerCount) || providerCount < 1
    || !Number.isInteger(configuredBudget) || configuredBudget < 1
    || plannedQueries > maximum) {
    throw new Error(`La campaña supera el presupuesto de ${maximum} consultas.`);
  }

  return plannedQueries;
}
