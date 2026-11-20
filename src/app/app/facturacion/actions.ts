"use server";

import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { getNextBillingAnchor } from "@/lib/stripe/billing-cycle";
import { LIVE_SUBSCRIPTION_STATUSES } from "@/lib/stripe/state";
import {
  createIntegrationIdentifier,
  getAppUrl,
  getStripe,
  getStripeConfig,
} from "@/lib/stripe/server";

async function getBillingContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (error || !userId) redirect("/login");

  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?error=Configura+primero+tu+empresa");

  const email = typeof claims?.email === "string" ? claims.email : undefined;
  return { supabase, userId, organization, email };
}

export async function startStripeCheckout() {
  const { supabase, userId, organization, email } = await getBillingContext();
  const { data: current } = await supabase
    .from("stripe_subscriptions")
    .select("stripe_customer_id, access_enabled")
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (current?.access_enabled) redirect("/app/facturacion?error=La+suscripción+ya+está+activa");

  try {
    const stripe = getStripe();
    const { priceId } = getStripeConfig();

    // Evita un segundo cobro si ya hay una suscripción viva que el webhook aún no reflejó.
    if (current?.stripe_customer_id) {
      const existing = await stripe.subscriptions.list({
        customer: current.stripe_customer_id,
        status: "all",
        limit: 20,
      });
      const live = existing.data.some(
        (subscription) =>
          LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)
          && subscription.items.data.some((item) => item.price.id === priceId),
      );
      if (live) redirect("/app/facturacion?error=Ya+tienes+una+suscripción+en+curso.+Espera+unos+segundos+y+actualiza");
    }
    const appUrl = getAppUrl();
    const anchor = getNextBillingAnchor();
    const metadata = {
      supabase_user_id: userId,
      organization_id: organization.id,
      stripe_price_id: priceId,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      managed_payments: { enabled: true },
      integration_identifier: createIntegrationIdentifier(),
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: "always",
      client_reference_id: userId,
      customer: current?.stripe_customer_id,
      customer_email: current?.stripe_customer_id ? undefined : email,
      metadata,
      subscription_data: {
        ...(anchor.unix ? { billing_cycle_anchor: anchor.unix } : {}),
        proration_behavior: "none",
        metadata,
      },
      success_url: `${appUrl}/app/facturacion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/facturacion/cancelado`,
    });

    if (!session.url) throw new Error("Stripe no devolvió una URL de Checkout.");
    redirect(session.url);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("No se pudo crear Checkout", error);
    redirect("/app/facturacion?error=No+se+pudo+iniciar+el+pago.+Inténtalo+de+nuevo");
  }
}

export async function openStripeCustomerPortal() {
  const { supabase, organization } = await getBillingContext();
  const { data: subscription } = await supabase
    .from("stripe_subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    redirect("/app/facturacion?error=Todavía+no+hay+una+cuenta+de+facturación");
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getAppUrl()}/app/facturacion`,
    });
    redirect(session.url);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("No se pudo abrir Customer Portal", error);
    redirect("/app/facturacion?error=No+se+pudo+abrir+el+portal+de+facturación");
  }
}
