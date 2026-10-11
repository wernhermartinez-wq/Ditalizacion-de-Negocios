import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const colors = ["#f4ebdd", "#cdbd9f", "#f0b36f", "#f39a5a", "#df7450", "#d35a3d"];

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Nexaro">
        <Link href="/login" className="brand-logo-link" aria-label="Nexaro, acceso"><BrandLogo className="auth-brand-logo" /></Link>
        <div className="story-copy">
          <h1>Convierte tu avance digital en decisiones claras.</h1>
          <p>Radar digital, plan de mejora y trabajo realizado en un mismo espacio para que tu restaurante sepa dónde está y cuál es el siguiente paso.</p>
        </div>
        <div className="dimension-stripe" aria-label="Recorrido de mejora digital">
          {colors.map((color, index) => (
            <span key={color} style={{ "--stripe": color, "--opacity": 0.55 + index * 0.08 } as React.CSSProperties} />
          ))}
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="brand" style={{ color: "var(--accent)" }}>ACCESO SEGURO</span>
          <h2>{title}</h2>
          <p>{description}</p>
          {children}
          <div className="auth-footnote">{footer}</div>
        </div>
      </section>
    </main>
  );
}
