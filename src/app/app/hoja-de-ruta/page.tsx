import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, CircleDot, Contact, CreditCard, MapPin, UtensilsCrossed } from "lucide-react";
import { getCurrentOrganization } from "@/lib/organizations";
import { assignedRestaurantRoadmapSteps, getCurrentRestaurantStep, restaurantRoadmapStages, restaurantStatusLabels } from "@/lib/restaurant-roadmap";
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
  const completed = steps.filter((step) => step.status === "completed").length;
  const lastCompletedStage = Math.max(0, ...steps.filter((step) => step.status === "completed").map((step) => step.stage));
  const focusStage = current?.stage ?? lastCompletedStage;

  return (
    <main className="page-content restaurant-roadmap-page">
      <div className="page-heading restaurant-roadmap-heading"><div><p className="eyebrow">{organization.name} · Recorrido acompañado</p><h1>Un paso claro cada vez.</h1><p className="page-description">Nexaro activa las acciones que corresponden a tu restaurante. Cuando una queda comprobada, avanzamos a la siguiente y la incorporamos al historial.</p></div><div className="restaurant-progress"><strong>{completed}/{steps.length || 0}</strong><span>pasos comprobados</span></div></div>

      <section className="restaurant-nfc-summary"><div><p className="eyebrow">Recorrido de fidelización</p><h2>Mesa → Caja → Regreso</h2></div><article><UtensilsCrossed size={21} /><span><strong>NFC Mesa · Descubre</strong><small>Abre carta, alta Wallet, reserva, contacto y reseña opcional.</small></span></article><article><CreditCard size={21} /><span><strong>NFC Caja · Acumula</strong><small>Un lector compatible registra la compra y acredita puntos o saldo.</small></span></article><article><Contact size={21} /><span><strong>Wallet · Regresa</strong><small>La tarjeta permanece en el móvil sin instalar una app.</small></span></article></section>

      {steps.length ? <section className="restaurant-route" aria-label="Recorrido de mejora del restaurante">
        <header><div><p className="eyebrow">Tu recorrido activo</p><h2>{current ? `Ahora: ${current.title}` : "Recorrido comprobado"}</h2></div><span>{steps.length} {steps.length === 1 ? "acción activa" : "acciones activas"}</span></header>
        <div className="restaurant-route-line">{steps.map((step, index) => {
          const isCurrent = current?.key === step.key;
          const isComplete = step.status === "completed";
          return <article className={`${isCurrent ? "is-current" : ""} ${isComplete ? "is-complete" : ""}`} key={step.key}>
            <div className="restaurant-route-marker">{isComplete ? <Check size={18} /> : index + 1}</div>
            <div className="restaurant-route-card">
              <div className="restaurant-route-meta"><span>Fase {step.stage} · {step.stageTitle}</span><span className={`restaurant-status status-${step.status}`}>{restaurantStatusLabels[step.status]}</span></div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <dl><div><dt>Qué hace Nexaro</dt><dd>{step.nexaroAction}</dd></div><div><dt>Cómo se comprueba</dt><dd>{step.evidence}</dd></div></dl>
              {step.note && <div className="restaurant-step-note"><strong>Actualización de Nexaro</strong>{step.note}</div>}
            </div>
          </article>;
        })}</div>
      </section> : <section className="restaurant-route-empty"><MapPin size={27} /><div><p className="eyebrow">Próximo paso</p><h2>Nexaro está preparando tu recorrido.</h2><p>Antes de mostrar tareas genéricas, revisaremos la situación real del restaurante y activaremos sólo la primera acción necesaria.</p></div></section>}

      <section className="restaurant-phase-progress" aria-label="Avance por fases">
        <header><div><p className="eyebrow">Avance general</p><h2>Las seis fases del recorrido</h2></div><span>{focusStage ? `Fase ${focusStage} de ${restaurantRoadmapStages.length}` : "Aún sin comenzar"}</span></header>
        <div className="restaurant-phase-track">{restaurantRoadmapStages.map((stage) => {
          const isComplete = focusStage > stage.stage || (focusStage === stage.stage && !current && lastCompletedStage === stage.stage);
          const isCurrent = current?.stage === stage.stage;
          return <article className={`${isComplete ? "is-complete" : ""} ${isCurrent ? "is-current" : ""}`} key={stage.stage}><span>{isComplete ? <Check size={14} /> : stage.stage}</span><div><strong>{stage.title}</strong><small>{stage.period}</small></div></article>;
        })}</div>
      </section>

      <p className="restaurant-roadmap-legal"><CircleDot size={14} /> La reseña es siempre voluntaria y no genera puntos. NFC Caja requiere un lector y una integración Wallet compatibles; una etiqueta NFC pasiva no acredita compras.</p>
    </main>
  );
}
