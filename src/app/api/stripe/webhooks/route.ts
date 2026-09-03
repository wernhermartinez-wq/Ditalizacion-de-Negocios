import { NextResponse } from "next/server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/server";
import { processStripeWebhook } from "@/lib/stripe/webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Firma ausente" }, { status: 400 });

  let event;
  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("Firma de webhook Stripe no válida", error);
    return NextResponse.json({ error: "Firma no válida" }, { status: 400 });
  }

  try {
    await processStripeWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Falló el webhook Stripe ${event.id}`, error);
    return NextResponse.json({ error: "No se pudo procesar el evento" }, { status: 500 });
  }
}
