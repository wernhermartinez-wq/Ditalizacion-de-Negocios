import "server-only";

import { randomBytes } from "node:crypto";
import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-07-29.dahlia" as const;
export const STRIPE_PRODUCTION_PRICE_ID = "price_1UBVm4IqsrQ2sW9YgMZpvgp3";

let stripeClient: Stripe | undefined;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name}.`);
  return value;
}

export function getStripeEnvironment() {
  const environment = process.env.STRIPE_ENVIRONMENT ?? "test";
  if (environment !== "test" && environment !== "production") {
    throw new Error("STRIPE_ENVIRONMENT debe ser test o production.");
  }
  return environment;
}

export function getStripeConfig() {
  const environment = getStripeEnvironment();

  const apiKey = required("STRIPE_API_KEY");
  if (environment === "production") {
    if (process.env.STRIPE_PRODUCTION_ENABLED !== "true") {
      throw new Error("Stripe producción requiere STRIPE_PRODUCTION_ENABLED=true.");
    }
    if (!/^(sk|rk)_live_/.test(apiKey)) throw new Error("Producción requiere una clave Stripe live.");
    const priceId = required("STRIPE_PRODUCTION_PRICE_ID");
    if (priceId !== STRIPE_PRODUCTION_PRICE_ID) {
      throw new Error("El Price ID productivo no coincide con el plan Nexaro aprobado.");
    }
    return { apiKey, priceId, environment };
  }

  const priceId = required("STRIPE_TEST_PRICE_ID");
  if (!/^(sk|rk)_test_/.test(apiKey)) throw new Error("STRIPE_API_KEY debe ser una clave de test.");
  if (priceId === STRIPE_PRODUCTION_PRICE_ID) throw new Error("El Price ID live no se admite en test.");
  if (!priceId.startsWith("price_")) throw new Error("STRIPE_TEST_PRICE_ID no es válido.");

  return { apiKey, priceId, environment };
}

export function getStripe() {
  const { apiKey } = getStripeConfig();
  stripeClient ??= new Stripe(apiKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
  return stripeClient;
}

export function getStripeWebhookSecret() {
  const secret = required("STRIPE_WEBHOOK_SECRET");
  if (!secret.startsWith("whsec_")) throw new Error("STRIPE_WEBHOOK_SECRET no es válido.");
  return secret;
}

export function getAppUrl() {
  const value = required("APP_URL").replace(/\/$/, "");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_URL debe usar HTTPS fuera del desarrollo local.");
  }
  return url.toString().replace(/\/$/, "");
}

export function createIntegrationIdentifier() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const suffix = Array.from(randomBytes(8), (byte) => alphabet[byte % alphabet.length]).join("");
  return `nexaro_${suffix}`;
}
