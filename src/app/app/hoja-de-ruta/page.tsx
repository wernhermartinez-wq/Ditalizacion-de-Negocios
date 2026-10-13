import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, CircleDot, Contact, CreditCard, MapPin, RefreshCw, UtensilsCrossed } from "lucide-react";
import { getCurrentOrganization } from "@/lib/organizations";
import { assignedRestaurantRoadmapSteps, getCurrentRestaurantStep, getRestaurantRoadmapProgress, restaurantImplementationStages, restaurantStatusLabels } from "@/lib/restaurant-roadmap";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Plan de mejora" };

export default async function RoadmapPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");
  const { data: tasks, error } = await supabase.from("nexaro_tasks").select("*").eq("organization_id", organization.id).order("created_at");
  if (error) throw new Error("No se pudo cargar el plan del restaurante.");

  const steps = assignedRestaurantRoadmapSteps(tasks ?? []);
  const current = getCurrentRestaurantStep(steps);
  const progress = getRestaurantRoadmapProgress(steps);
  const completedSteps = steps.filter((step) => step.status === "completed").length;
  const coreCurrent = current?.stage && current.stage <= 6 ? current : null;

  return (
    <main className="page-content restaurant-roadmap-page">
      <div className="page-heading restaurant-roadmap-heading"><div><p className="eyebrow">{organization.name} · Recorrido acompañado</p><h1>{progress.implementationComplete ? "Búsqueda de mejora permanente." : "Un paso claro cada vez."}</h1><p className="page-description">{progress.implementationComplete ? "Las seis fases de implantación están completas. El recorrido permanece visible y Nexaro continúa midiendo, revisando y proponiendo mejoras." : "Nexaro activa las acciones que corresponden a tu restaurante. Cuando una queda comprobada, avanzamos a la siguiente y la incorporamos al historial."}</p></div><div className={`restaurant-progress ${progress.implementationComplete ? "is-complete" : ""}`}><strong>{progress.percentage}%</strong><span>{progress.completedStages} de {progress.totalStages} fases</span><small>{completedSteps} de {steps.length} pasos comprobados</small></div></div>

      <section className="restaurant-nfc-summary"><div><p className="eyebrow">Recorrido de fidelización</p><h2>Mesa → Caja → Regreso</h2></div><article><UtensilsCrossed size={21} /><span><strong>NFC Mesa · Únete</strong><small>Añade Wallet o accede voluntariamente a la reseña.</small></span></article><article><CreditCard size={21} /><span><strong>NFC Caja · Acumula</strong><small>Un lector compatible registra la compra y acredita puntos o saldo.</small></span></article><article><Contact size={21} /><span><strong>Wallet · Regresa</strong><small>Conserva la tarjeta, el saldo y las recompensas en el móvil.</small></span></article></section>

      {steps.length ? <section className="restaurant-route" aria-label="Recorrido de mejora del restaurante">
        <header><div><p className="eyebrow">{progress.implementationComplete ? "Mejora permanente" : "Tu recorrido activo"}</p><h2>{current ? `Ahora: ${current.title}` : progress.implementationComplete ? "Implantación completada; seguimos mejorando" : "Recorrido comprobado"}</h2></div><span>{steps.length} {steps.length === 1 ? "acción visible" : "acciones visibles"}</span></header>
        <div className="restaurant-route-line">{steps.map((step, index) => {
          const isCurrent = current?.key === step.key;
          const isComplete = step.status === "completed";
          const startsStage = index === 0 || steps[index - 1]?.stage !== step.stage;
          return <article id={startsStage ? `fase-${step.stage}` : undefined} className={`${isCurrent ? "is-current" : ""} ${isComplete ? "is-complete" : ""}`} key={step.key}>
            <div className="restaurant-route-marker">{isComplete ? <Check size={18} /> : step.code}</div>
            <div className="restaurant-route-card">
              <div className="restaurant-route-meta"><span>{step.code} · {step.stageTitle}</span><span className={`restaurant-status status-${step.status}`}>{restaurantStatusLabels[step.status]}</span></div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <dl><div><dt>Qué hace Nexaro</dt><dd>{step.nexaroAction}</dd></div><div><dt>Cómo se comprueba</dt><dd>{step.evidence}</dd></div></dl>
              {step.note && <div className="restaurant-step-note"><strong>Actualización de Nexaro</strong>{step.note}</div>}
            </div>
          </article>;
        })}</div>
      </section> : <section className="restaurant-route-empty"><MapPin size={27} /><div><p className="eyebrow">Próximo paso</p><h2>Nexaro está preparando tu recorrido.</h2><p>Antes de mostrar tareas genéricas, revisaremos la situación real del restaurante y activaremos sólo la primera acción necesaria.</p></div></section>}

      <section className="restaurant-phase-progress" aria-label="Avance de las seis fases de implantación">
        <header><div><p className="eyebrow">Avance general</p><h2>Las seis fases de implantación</h2></div><span>{progress.implementationComplete ? "100% completado" : `${progress.completedStages} de ${progress.totalStages} fases`}</span></header>
        <div className="restaurant-progress-bar" aria-label={`${progress.percentage}% completado`}><span style={{ width: `${progress.percentage}%` }} /></div>
        <div className="restaurant-phase-track">{restaurantImplementationStages.map((stage) => {
          const state = progress.stageStates.find((item) => item.stage === stage.stage);
          const isComplete = state?.completed ?? false;
          const isCurrent = coreCurrent?.stage === stage.stage;
          return <article className={`${isComplete ? "is-complete" : ""} ${isCurrent ? "is-current" : ""}`} key={stage.stage}><span>{isComplete ? <Check size={14} /> : stage.stage}</span><div><strong>{stage.title}</strong><small>{state?.assigned ? stage.period : "Por activar"}</small></div></article>;
        })}</div>
        <div className={`restaurant-continuous-improvement ${progress.implementationComplete ? "is-active" : ""}`}><RefreshCw size={18} /><div><strong>Búsqueda de mejora permanente</strong><small>{progress.implementationComplete ? "Activa: medimos resultados y elegimos el siguiente avance cada mes." : "Se activa al completar las seis fases de implantación."}</small></div></div>
      </section>

      <p className="restaurant-roadmap-legal"><CircleDot size={14} /> La reseña es siempre voluntaria y no genera puntos. NFC Caja requiere un lector y una integración Wallet compatibles; una etiqueta NFC pasiva no acredita compras.</p>
    </main>
  );
}
