import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CheckoutCanceledPage() {
  return (
    <main className="page-content billing-result-page">
      <section className="card billing-result-card">
        <ArrowLeft size={32} />
        <p className="eyebrow">Checkout cancelado</p>
        <h1>No se ha creado ninguna suscripción</h1>
        <p>No se ha modificado tu acceso. Puedes volver a intentarlo cuando quieras.</p>
        <Link className="button-primary" href="/app/facturacion">Volver a facturación</Link>
      </section>
    </main>
  );
}
