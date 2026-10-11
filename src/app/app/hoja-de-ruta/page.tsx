import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, CircleDot, Contact, CreditCard, UtensilsCrossed } from "lucide-react";
import { getCurrentOrganization } from "@/lib/organizations";
import { getCurrentRestaurantStep, mergeRestaurantRoadmapTasks, restaurantStatusLabels } from "@/lib/restaurant-roadmap";
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
  const steps = mergeRestaurantRoadmapTasks(tasks ?? []);
  const current = getCurrentRestaurantStep(steps);
  const stages = Array.from(new Set(steps.map((step) => step.stage)));
  return (
    <main className="page-content restaurant-roadmap-page">
      <div className="page-heading restaurant-roadmap-heading"><div><p className="eyebrow">{organization.name} · Plan acompañado</p><h1>El camino para atraer clientes y conseguir que vuelvan.</h1><p className="page-description">Nexaro realiza y comprueba cada mejora. Tú ves el estado, lo que necesitamos del restaurante y la evidencia de que el paso está terminado.</p></div><div className="restaurant-progress"><strong>{steps.filter((step) => step.status === "completed").length}/{steps.length}</strong><span>comprobados</span></div></div>
      <section className="restaurant-nfc-summary"><div><p className="eyebrow">Recorrido de fidelización</p><h2>Mesa → Caja → Regreso</h2></div><article><UtensilsCrossed size={21} /><span><strong>NFC Mesa · Descubre</strong><small>Abre carta, alta Wallet, reserva, contacto y reseña opcional.</small></span></article><article><CreditCard size={21} /><span><strong>NFC Caja · Acumula</strong><small>Un lector compatible registra la compra y acredita puntos o saldo.</small></span></article><article><Contact size={21} /><span><strong>Wallet · Regresa</strong><small>La tarjeta permanece en el móvil sin instalar una app.</small></span></article></section>
      <div className="restaurant-roadmap-stages">{stages.map((stage) => { const stageSteps = steps.filter((step) => step.stage === stage); const isCurrent = current?.stage === stage; const stageComplete = stageSteps.every((step) => step.status === "completed"); return <section className={`restaurant-stage ${isCurrent ? "is-current" : ""} ${stageComplete ? "is-complete" : ""}`} key={stage}><header><span>{stageComplete ? <Check size={19} /> : stage}</span><div><p>{stageSteps[0].period}</p><h2>{stageSteps[0].stageTitle}</h2></div>{isCurrent && <b>Etapa actual</b>}</header><div className="restaurant-stage-steps">{stageSteps.map((step) => <article key={step.key}><div className="restaurant-step-title"><CircleDot size={17} /><h3>{step.title}</h3><span className={`restaurant-status status-${step.status}`}>{restaurantStatusLabels[step.status]}</span></div><p>{step.description}</p><dl><div><dt>Qué hace Nexaro</dt><dd>{step.nexaroAction}</dd></div><div><dt>Cómo se comprueba</dt><dd>{step.evidence}</dd></div><div><dt>Participa</dt><dd>{step.owner}</dd></div></dl>{step.note && <div className="restaurant-step-note"><strong>Actualización</strong>{step.note}</div>}</article>)}</div></section>; })}</div>
      <p className="restaurant-roadmap-legal">La reseña es siempre voluntaria y no genera puntos. NFC Caja requiere un lector y una integración Wallet compatibles; una etiqueta NFC pasiva no acredita compras.</p>
    </main>
  );
}
