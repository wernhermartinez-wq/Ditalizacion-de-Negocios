import Link from "next/link";
import { Clock3 } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <main className="page-content billing-result-page">
      <section className="card billing-result-card">
        <Clock3 size={32} />
        <p className="eyebrow">Checkout completado</p>
        <h1>Estamos confirmando tu suscripción</h1>
        <p>El acceso se activa exclusivamente cuando llega el webhook firmado de Stripe. Normalmente tarda solo unos segundos.</p>
        <Link className="button-primary" href="/app/facturacion">Consultar estado</Link>
      </section>
    </main>
  );
}
