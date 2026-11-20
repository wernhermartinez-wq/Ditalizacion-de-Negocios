export function subscriptionGrantsAccess(status: string, allowTrialing = false) {
  return status === "active" || (allowTrialing && status === "trialing");
}

export function isNexaroAccompanimentSubscription(
  itemPriceIds: string[],
  expectedPriceId: string,
  metadataPriceId: string | null | undefined,
) {
  return metadataPriceId === expectedPriceId && itemPriceIds.includes(expectedPriceId);
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_PAST_DUE_GRACE_DAYS = 7;
const MAX_PAST_DUE_GRACE_DAYS = 30;

// STRIPE_PAST_DUE_GRACE_DAYS: días de acceso tras un pago fallido (0 = sin gracia).
export function parseGraceDays(raw: string | undefined) {
  if (raw === undefined || raw.trim() === "") return DEFAULT_PAST_DUE_GRACE_DAYS;
  const days = Number(raw);
  if (!Number.isFinite(days)) return DEFAULT_PAST_DUE_GRACE_DAYS;
  return Math.min(MAX_PAST_DUE_GRACE_DAYS, Math.max(0, Math.floor(days)));
}

// Conserva el inicio del impago mientras siga en past_due y lo borra al regularizarse.
export function nextPastDueSince(
  status: string,
  currentPastDueSince: string | null | undefined,
  eventCreatedUnix: number,
) {
  if (status !== "past_due") return null;
  return currentPastDueSince ?? new Date(eventCreatedUnix * 1000).toISOString();
}

export function gracePeriodEnd(pastDueSince: string | null | undefined, graceDays: number) {
  const since = pastDueSince ? Date.parse(pastDueSince) : Number.NaN;
  if (Number.isNaN(since) || graceDays <= 0) return null;
  return new Date(since + graceDays * DAY_MS).toISOString();
}

export function isInGracePeriod(
  status: string,
  pastDueSince: string | null | undefined,
  graceDays: number,
  now = Date.now(),
) {
  if (status !== "past_due") return false;
  const end = gracePeriodEnd(pastDueSince, graceDays);
  return end !== null && now < Date.parse(end);
}

// Acceso efectivo: suscripción al corriente o impago dentro del periodo de gracia.
export function hasBillingAccess(
  subscription: { access_enabled: boolean; status: string; past_due_since?: string | null } | null | undefined,
  graceDays: number,
  now = Date.now(),
) {
  if (!subscription) return false;
  return subscription.access_enabled
    || isInGracePeriod(subscription.status, subscription.past_due_since, graceDays, now);
}

export function isOlderStripeEvent(currentCreated: number | null | undefined, incomingCreated: number) {
  return (currentCreated ?? 0) > incomingCreated;
}

export const PROCESSING_LEASE_MS = 5 * 60 * 1000;

// Un evento que lleva más de PROCESSING_LEASE_MS en "processing" quedó huérfano
// (timeout o caída del servidor) y debe poder reintentarse.
export function isStaleProcessingEvent(
  receivedAt: string | null | undefined,
  now = Date.now(),
  leaseMs = PROCESSING_LEASE_MS,
) {
  const started = receivedAt ? Date.parse(receivedAt) : Number.NaN;
  return Number.isNaN(started) || now - started > leaseMs;
}

// Una segunda suscripción activa de la misma organización es un cobro duplicado.
export function isDuplicateActiveSubscription(
  currentSubscriptionId: string | null | undefined,
  currentAccessEnabled: boolean | null | undefined,
  incomingSubscriptionId: string,
  incomingAccessEnabled: boolean,
) {
  return Boolean(
    currentSubscriptionId
    && currentSubscriptionId !== incomingSubscriptionId
    && currentAccessEnabled
    && incomingAccessEnabled,
  );
}

// Estados de Stripe que ya representan una suscripción viva o pendiente de pago.
export const LIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "unpaid", "incomplete"];

export function isStaleInactiveReplacement(
  currentSubscriptionId: string | null | undefined,
  currentAccessEnabled: boolean | null | undefined,
  incomingSubscriptionId: string,
  incomingAccessEnabled: boolean,
) {
  return Boolean(
    currentSubscriptionId
    && currentSubscriptionId !== incomingSubscriptionId
    && currentAccessEnabled
    && !incomingAccessEnabled,
  );
}
