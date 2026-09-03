import type { Metadata } from "next";
import { CalendarDays, Check, CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthMessage } from "@/components/auth/message";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { openStripeCustomerPortal, startStripeCheckout } from "./actions";

export const metadata: Metadata = { title: "Facturación" };

type PageProps = { searchParams: Promise<{ error?: string }> };

function formatDate(value: string | null) {
  if (!value) return "Pendiente de Stripe";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Berlin",
    dateStyle: "long",
  }).format(new Date(value));
}

export default async function BillingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");

  const organization = await getCurrentOrganization(supabase, userId);
  const [{ data: subscription }, params] = await Promise.all([
    organization
      ? supabase.from("stripe_subscriptions").select("*").eq("organization_id", organization.id).maybeSingle()
      : Promise.resolve({ data: null }),
    searchParams,
  ]);

  return (
    <main className="page-content billing-page">
      <div className="page-heading billing-heading">
        <div>
          <p className="eyebrow">Plan Nexaro</p>
          <h1>Facturación clara, siempre el día 15</h1>
          <p className="page-description">Activa el acceso mediante el Checkout seguro de Stripe. Esta integración permanece en modo de prueba.</p>
        </div>
        <span className="real-data-badge"><ShieldCheck size={16} /> Managed Payments</span>
      </div>

      <AuthMessage error={params.error} />

      <section className="billing-grid">
        <article className="card billing-plan-card">
          <header><span>Suscripción mensual</span><strong>95 €<small>/mes</small></strong></header>
          <ul>
            <li><Check size={16} /> Acceso desde que Stripe confirma Checkout</li>
            <li><Check size={16} /> Sin cobro hasta el próximo día 15</li>
            <li><Check size={16} /> Renovación automática cada día 15</li>
            <li><Check size={16} /> Si te das de alta el día 15, el cobro es inmediato</li>
          </ul>
          {!subscription?.access_enabled ? (
            <form action={startStripeCheckout}><button className="button-primary" type="submit"><CreditCard size={17} /> Continuar a Checkout de prueba</button></form>
          ) : (
            <div className="billing-active"><Check size={17} /> Suscripción activa</div>
          )}
          <small className="billing-note">Stripe gestiona los métodos de pago y la fiscalidad mediante Managed Payments. Nexaro no recibe datos de tarjeta.</small>
        </article>

        <article className="card billing-status-card">
          <div className="billing-status-icon"><CalendarDays size={24} /></div>
          <p className="eyebrow">Estado verificado</p>
          <h2>{subscription ? subscription.status.replaceAll("_", " ") : "Sin suscripción"}</h2>
          <dl>
            <div><dt>Acceso</dt><dd>{subscription?.access_enabled ? "Activo" : "No activo"}</dd></div>
            <div><dt>Próximo cobro</dt><dd>{formatDate(subscription?.next_billing_at ?? null)}</dd></div>
            <div><dt>Renovación</dt><dd>{subscription?.cancel_at_period_end ? "Se cancelará al final del periodo" : "Automática"}</dd></div>
          </dl>
          {subscription && (
            <form action={openStripeCustomerPortal}>
              <button className="button-secondary" type="submit">Gestionar o cancelar en Stripe <ExternalLink size={15} /></button>
            </form>
          )}
          <p className="billing-webhook-copy">Este estado solo cambia cuando Nexaro valida un webhook firmado de Stripe; la redirección del navegador no activa el acceso.</p>
        </article>
      </section>
    </main>
  );
}
