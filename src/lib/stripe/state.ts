export function subscriptionGrantsAccess(status: string) {
  return status === "active" || status === "trialing";
}
