export function isDuplicateRunError(error: { code?: string } | null) {
  return error?.code === "23505";
}

export function determineRunStatus(completedProviders: number, failedProviders: number) {
  return completedProviders === 0 ? "failed" as const : failedProviders > 0 ? "partial" as const : "completed" as const;
}
