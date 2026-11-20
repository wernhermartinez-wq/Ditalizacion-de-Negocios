import "server-only";

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isDuplicateActiveSubscription,
  isNexaroAccompanimentSubscription,
  isOlderStripeEvent,
  isStaleProcessingEvent,
  isStaleInactiveReplacement,
  nextPastDueSince,
  subscriptionGrantsAccess,
} from "./state";
import { getStripe, getStripeConfig } from "./server";

function idOf(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function isoFromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function persistSubscription(
  subscription: Stripe.Subscription,
  event: Stripe.Event,
  options?: {
    checkoutSessionId?: string;
  },
) {
  const admin = createAdminClient();
  const { data: linkedSubscription, error: linkedError } = await admin
    .from("stripe_subscriptions")
    .select("organization_id, user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (linkedError) throw linkedError;

  const organizationId = linkedSubscription?.organization_id ?? subscription.metadata.organization_id;
  const userId = linkedSubscription?.user_id ?? subscription.metadata.supabase_user_id;
  if (!organizationId || !userId) {
    throw new Error(`La suscripción ${subscription.id} no contiene metadatos de Nexaro.`);
  }

  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) {
    throw new Error(`La suscripción ${subscription.id} no pertenece a un miembro de la organización indicada.`);
  }

  const { data: current, error: currentError } = await admin
    .from("stripe_subscriptions")
    .select("last_stripe_event_created, stripe_checkout_session_id, stripe_subscription_id, access_enabled, past_due_since")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (isOlderStripeEvent(current?.last_stripe_event_created, event.created)) return;

  const { priceId, allowTrialing } = getStripeConfig();
  const item = subscription.items.data.find((entry) => entry.price.id === priceId);
  if (!isNexaroAccompanimentSubscription(
    subscription.items.data.map((entry) => entry.price.id),
    priceId,
    subscription.metadata.stripe_price_id,
  )) return;

  const status = subscription.status;
  const accessEnabled = subscriptionGrantsAccess(status, allowTrialing);
  const customerId = idOf(subscription.customer);
  if (!customerId || !item?.price?.id) throw new Error("Stripe devolvió una suscripción incompleta.");

  // Una cancelación tardía de una suscripción anterior no puede desactivar una
  // suscripción nueva y activa de la misma organización.
  if (isStaleInactiveReplacement(
    current?.stripe_subscription_id,
    current?.access_enabled,
    subscription.id,
    accessEnabled,
  )) return;

  // Segunda suscripción activa (p. ej. Checkout abierto dos veces): se conserva la
  // primera y se cancela la duplicada para evitar un doble cobro.
  if (isDuplicateActiveSubscription(
    current?.stripe_subscription_id,
    current?.access_enabled,
    subscription.id,
    accessEnabled,
  )) {
    await getStripe().subscriptions.cancel(subscription.id, { prorate: false, invoice_now: false });
    console.error(
      `Suscripción duplicada ${subscription.id} cancelada para la organización ${organizationId}. Revisar en Stripe si requiere reembolso.`,
    );
    return;
  }

  const { error } = await admin.from("stripe_subscriptions").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_checkout_session_id:
        options?.checkoutSessionId ?? current?.stripe_checkout_session_id ?? null,
      stripe_price_id: item.price.id,
      status,
      access_enabled: accessEnabled,
      next_billing_at: isoFromUnix(item.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      past_due_since: nextPastDueSince(
        status,
        current?.stripe_subscription_id === subscription.id ? current.past_due_since : null,
        event.created,
      ),
      last_stripe_event_created: event.created,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) throw error;
}

async function retrieveInvoiceSubscription(invoice: Stripe.Invoice) {
  const reference = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = idOf(reference);
  if (!subscriptionId) return null;
  return getStripe().subscriptions.retrieve(subscriptionId);
}

async function retrieveCurrentSubscription(subscription: Stripe.Subscription) {
  return getStripe().subscriptions.retrieve(subscription.id);
}

async function processSupportedEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || session.status !== "complete") return;
      const subscriptionId = idOf(session.subscription);
      if (!subscriptionId) throw new Error("Checkout completado sin suscripción.");
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await persistSubscription(subscription, event, {
        checkoutSessionId: session.id,
      });
      return;
    }
    case "invoice.paid": {
      const subscription = await retrieveInvoiceSubscription(event.data.object);
      if (subscription) await persistSubscription(subscription, event);
      return;
    }
    case "invoice.payment_failed": {
      const subscription = await retrieveInvoiceSubscription(event.data.object);
      if (subscription) await persistSubscription(subscription, event);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = await retrieveCurrentSubscription(event.data.object);
      await persistSubscription(subscription, event);
      return;
    }
    case "customer.subscription.deleted":
      await persistSubscription(event.data.object, event);
      return;
  }
}

export async function processStripeWebhook(event: Stripe.Event) {
  const admin = createAdminClient();
  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    status: "processing",
    event_created: event.created,
  });

  if (insertError?.code === "23505") {
    const { data: previous, error } = await admin
      .from("stripe_webhook_events")
      .select("status, received_at")
      .eq("stripe_event_id", event.id)
      .single();
    if (error) throw error;
    if (previous.status === "completed") return;
    if (previous.status === "processing" && !isStaleProcessingEvent(previous.received_at)) return;
    // Se reclama el evento solo si sigue en el mismo estado, para que dos
    // reintentos simultáneos no lo procesen a la vez.
    const { data: claimed, error: retryError } = await admin
      .from("stripe_webhook_events")
      .update({ status: "processing", error_message: null, received_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id)
      .eq("status", previous.status)
      .select("stripe_event_id");
    if (retryError) throw retryError;
    if (!claimed?.length) return;
  } else if (insertError) {
    throw insertError;
  }

  try {
    await processSupportedEvent(event);
    const { error } = await admin
      .from("stripe_webhook_events")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Error desconocido";
    await admin
      .from("stripe_webhook_events")
      .update({ status: "failed", error_message: message, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
    throw error;
  }
}
