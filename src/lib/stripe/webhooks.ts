import "server-only";

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionGrantsAccess } from "./state";
import { getStripe } from "./server";

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
    forceAccess?: boolean;
    forceStatus?: string;
  },
) {
  const organizationId = subscription.metadata.organization_id;
  const userId = subscription.metadata.supabase_user_id;
  if (!organizationId || !userId) {
    throw new Error(`La suscripción ${subscription.id} no contiene metadatos de Nexaro.`);
  }

  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin
    .from("stripe_subscriptions")
    .select("last_stripe_event_created, stripe_checkout_session_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (currentError) throw currentError;
  if ((current?.last_stripe_event_created ?? 0) > event.created) return;

  const item = subscription.items.data[0];
  const status = options?.forceStatus ?? subscription.status;
  const accessEnabled = options?.forceAccess ?? subscriptionGrantsAccess(status);
  const customerId = idOf(subscription.customer);
  if (!customerId || !item?.price?.id) throw new Error("Stripe devolvió una suscripción incompleta.");

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
        forceAccess: true,
      });
      return;
    }
    case "invoice.paid": {
      const subscription = await retrieveInvoiceSubscription(event.data.object);
      if (subscription) await persistSubscription(subscription, event, { forceAccess: true });
      return;
    }
    case "invoice.payment_failed": {
      const subscription = await retrieveInvoiceSubscription(event.data.object);
      if (subscription) {
        await persistSubscription(subscription, event, {
          forceAccess: false,
          forceStatus: "payment_failed",
        });
      }
      return;
    }
    case "customer.subscription.updated":
      await persistSubscription(event.data.object, event);
      return;
    case "customer.subscription.deleted":
      await persistSubscription(event.data.object, event, {
        forceAccess: false,
        forceStatus: "canceled",
      });
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
      .select("status")
      .eq("stripe_event_id", event.id)
      .single();
    if (error) throw error;
    if (previous.status === "completed" || previous.status === "processing") return;
    const { error: retryError } = await admin
      .from("stripe_webhook_events")
      .update({ status: "processing", error_message: null })
      .eq("stripe_event_id", event.id);
    if (retryError) throw retryError;
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
