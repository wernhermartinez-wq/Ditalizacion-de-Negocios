"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-content module-stage"><section className="state-card"><div className="state-visual" style={{ color: "var(--danger)", background: "#fbe9e3" }}><AlertTriangle size={24} /></div><p className="eyebrow">No se pudo cargar la vista</p><h1>Los datos no están disponibles ahora</h1><p>Comprueba tu conexión e inténtalo de nuevo. Si continúa, contacta con Nexaro.</p><button className="button-primary" onClick={reset}>Reintentar</button></section></main>;
}
