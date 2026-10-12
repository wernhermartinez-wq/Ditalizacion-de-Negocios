import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, CircleDot, Contact, CreditCard, MapPin, UtensilsCrossed } from "lucide-react";
import type { RestaurantRoadmapStep } from "@/lib/restaurant-roadmap";
import { getCurrentRestaurantStep, restaurantImplementationStages } from "@/lib/restaurant-roadmap";

export function Dashboard({ organizationName, steps, workCount }: { organizationName: string; steps: RestaurantRoadmapStep[]; workCount: number }) {
  const current = getCurrentRestaurantStep(steps);
  const completed = steps.filter((step) => step.status === "completed").length;
  const phases = restaurantImplementationStages.map((phase) => {
    const phaseSteps = steps.filter((step) => step.stage === phase.stage);
    const completedSteps = phaseSteps.filter((step) => step.status === "completed").length;
    const complete = phaseSteps.length > 0 && completedSteps === phaseSteps.length;
    const active = !complete && (phaseSteps.some((step) => step.status === "in_progress") || completedSteps > 0 || current?.stage === phase.stage);
    return { ...phase, assigned: phaseSteps.length > 0, complete, active };
  });
  const activePhase = phases.find((phase) => phase.active) ?? phases.find((phase) => phase.assigned && !phase.complete) ?? phases[0];
  const implementationComplete = phases.every((phase) => phase.complete);
  const hasPlan = steps.length > 0;

  return (
    <main className="page-content restaurant-dashboard">
      <div className="page-heading restaurant-dashboard-heading"><div><p className="eyebrow">{organizationName} · Plan acompañado por Nexaro</p><h1>Tu restaurante, más visible y fácil de elegir.</h1><p className="page-description">Aquí ves el avance real de tu restaurante, lo que Nexaro ya comprobó y cuál es el próximo paso.</p></div><span className="real-data-badge"><CheckCircle2 size={16} /> Seguimiento real</span></div>

      <section className="restaurant-overview" aria-labelledby="restaurant-overview-title">
        <header><div><p className="eyebrow">{implementationComplete ? "Implantación completada" : `Fase actual · ${activePhase.stage} de 6`}</p><h2 id="restaurant-overview-title">{implementationComplete ? "Búsqueda de mejora permanente" : activePhase.title}</h2><p>{implementationComplete ? "Las seis fases están comprobadas. Nexaro continúa midiendo resultados y definiendo mejoras." : current?.description ?? "Nexaro activará el primer paso después de analizar la situación real del restaurante."}</p></div><strong>{phases.filter((phase) => phase.complete).length}/6</strong></header>
        <nav className="restaurant-dashboard-timeline" aria-label="Fases del recorrido del restaurante">
          {phases.map((phase) => {
            const state = phase.complete ? "Completada" : phase.active ? "En curso" : phase.assigned ? "Próximo paso" : "Por activar";
            return <Link className={`${phase.complete ? "is-complete" : ""} ${phase.active ? "is-active" : ""}`} href={`/app/hoja-de-ruta#fase-${phase.stage}`} key={phase.stage} aria-label={`Fase ${phase.stage}: ${phase.title}. ${state}`}>
              <span className="restaurant-timeline-marker">{phase.complete ? <Check size={17} /> : phase.stage}</span>
              <span className="restaurant-timeline-copy"><small>Fase {phase.stage}</small><strong>{phase.title}</strong><em>{state}</em></span>
            </Link>;
          })}
        </nav>
        <footer><p>{implementationComplete ? "El recorrido no termina: comienza la revisión continua de resultados." : current ? <><strong>Siguiente acción:</strong> {current.title}</> : "Nexaro está preparando el primer paso del recorrido."}</p><Link href={`/app/hoja-de-ruta#fase-${activePhase.stage}`}>Ver detalle de la fase {activePhase.stage} <ArrowRight size={16} /></Link></footer>
      </section>

      <section className="restaurant-journey" aria-labelledby="restaurant-journey-title"><header><p className="eyebrow">Experiencia en el local</p><h2 id="restaurant-journey-title">Mesa → Caja → Regreso</h2><p>Dos momentos NFC conectan la visita con una relación útil, sin obligar al cliente a instalar una aplicación.</p></header><div className="restaurant-journey-flow"><article><span><UtensilsCrossed size={22} /></span><small>NFC Mesa</small><h3>Únete</h3><p>Añade la tarjeta Wallet o accede voluntariamente a la reseña.</p></article><ArrowRight className="journey-arrow" aria-hidden="true" /><article><span><CreditCard size={22} /></span><small>NFC Caja</small><h3>Acumula</h3><p>Un lector compatible acredita puntos o saldo cuando el cliente paga.</p></article><ArrowRight className="journey-arrow" aria-hidden="true" /><article><span><Contact size={22} /></span><small>Wallet</small><h3>Regresa</h3><p>El cliente conserva su tarjeta, saldo y recompensas en el móvil.</p></article></div><p className="journey-clarification"><CircleDot size={15} /> Los puntos se obtienen por compra o visita. La reseña siempre es voluntaria y no se recompensa.</p></section>
      <div className="restaurant-dashboard-grid"><Link className="card restaurant-summary-card" href="/app/hoja-de-ruta"><MapPin size={22} /><span><small>Plan de mejora</small><strong>{hasPlan ? `${completed} de ${steps.length} pasos comprobados` : "Primer paso en preparación"}</strong><em>Ver situación y próximos pasos <ArrowRight size={15} /></em></span></Link><Link className="card restaurant-summary-card" href="/app/trabajo-nexaro"><CheckCircle2 size={22} /><span><small>Trabajo realizado</small><strong>{workCount} intervenciones registradas</strong><em>Ver qué hizo Nexaro <ArrowRight size={15} /></em></span></Link><Link className="card restaurant-summary-card" href="/app/perfil"><UtensilsCrossed size={22} /><span><small>Datos del local</small><strong>Información del restaurante</strong><em>Revisar y actualizar <ArrowRight size={15} /></em></span></Link></div>
    </main>
  );
}
