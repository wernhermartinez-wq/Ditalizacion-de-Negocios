import Link from "next/link";

const colors = ["#6dc6c0", "#94d0bd", "#e8c879", "#7eb7ce", "#af9fd1", "#df9d7d"];

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
        <Link href="/login" className="brand">NEXARO</Link>
        <div className="story-copy">
          <h1>Convierte tu avance digital en decisiones claras.</h1>
          <p>Diagnóstico, prioridades y trabajo realizado en un mismo espacio para que tu empresa sepa dónde está y cuál es el siguiente paso.</p>
        </div>
        <div className="dimension-stripe" aria-label="Seis dimensiones de madurez digital">
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
