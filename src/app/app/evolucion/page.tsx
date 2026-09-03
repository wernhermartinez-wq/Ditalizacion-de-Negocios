import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { buildEvolutionTimeline, scoreDelta } from "@/lib/evolution";
import { scoreLabel } from "@/lib/diagnostics";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Evolución" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function deltaLabel(delta: number | null) {
  if (delta === null) return "Sin comparación";
  if (delta === 0) return "Sin cambio";
  return `${delta > 0 ? "+" : ""}${delta.toLocaleString("es-ES", { maximumFractionDigits: 2 })} puntos`;
}

export default async function EvolutionPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");

  const diagnosticsResult = await supabase.from("diagnostics").select("id, validated_at").eq("organization_id", organization.id).eq("status", "validated").order("validated_at");
  if (diagnosticsResult.error) throw new Error("No se pudo cargar el historial de diagnósticos.");
  const diagnostics = diagnosticsResult.data ?? [];
  const scoresResult = diagnostics.length
    ? await supabase.from("assessment_scores").select("assessment_id, dimension_id, score").in("assessment_id", diagnostics.map((diagnostic) => diagnostic.id))
    : { data: [], error: null };
  if (scoresResult.error) throw new Error("No se pudieron cargar las puntuaciones históricas.");

  const timeline = buildEvolutionTimeline(diagnostics, scoresResult.data ?? []);
  const latest = timeline.at(-1);
  const previous = timeline.at(-2);
  const overallDelta = scoreDelta(latest?.overallScore ?? null, previous?.overallScore ?? null);

  if (!latest) return <main className="page-content evolution-page evolution-empty-page"><section className="card evolution-empty"><ChartNoAxesCombined size={32} /><p className="eyebrow">Historial validado</p><h1>La evolución empieza con una referencia fiable.</h1><p>Cuando Nexaro valide tu primer diagnóstico, este espacio conservará el resultado y permitirá compararlo con futuras revisiones.</p><Link href="/app/diagnostico">Ir al diagnóstico <ArrowRight size={16} /></Link></section></main>;

  return (
    <main className="page-content evolution-page">
      <div className="page-heading evolution-heading"><div><p className="eyebrow">Historial validado</p><h1>Cómo cambia la madurez digital de {organization.name}.</h1><p className="page-description">Cada punto usa el snapshot congelado en su fecha de validación; los cambios posteriores en fórmulas no alteran el pasado.</p></div><span className="real-data-badge"><CalendarDays size={16} /> {timeline.length} {timeline.length === 1 ? "medición" : "mediciones"}</span></div>

      <section className="evolution-overview">
        <article className="evolution-score-card"><small>Resultado más reciente</small><strong>{latest.overallScore === null ? "—" : Math.round(latest.overallScore)}<span>/100</span></strong><p>{scoreLabel(latest.overallScore)} · Validado el {formatDate(latest.validatedAt)}</p></article>
        <article className={`evolution-delta-card ${overallDelta !== null && overallDelta < 0 ? "negative" : ""}`}><span>{overallDelta === null || overallDelta === 0 ? <Minus size={22} /> : overallDelta > 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}</span><div><small>Frente a la medición anterior</small><strong>{deltaLabel(overallDelta)}</strong><p>{previous ? `Referencia del ${formatDate(previous.validatedAt)}` : "Se necesita una segunda validación para medir el cambio."}</p></div></article>
      </section>

      <section className="card evolution-chart-card">
        <div className="card-head"><div><p className="eyebrow">Trayectoria</p><h2>Puntuación global validada</h2></div><span>0—100</span></div>
        <div className="evolution-chart" role="img" aria-label="Evolución de la puntuación global validada">
          <div className="chart-guides" aria-hidden="true"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
          <div className="chart-points">{timeline.map((point) => <article key={point.diagnosticId}><strong>{point.overallScore === null ? "—" : Math.round(point.overallScore)}</strong><div><i style={{ height: `${point.overallScore === null ? 0 : Math.max(point.overallScore, 2)}%` }} /></div><time dateTime={point.validatedAt}>{formatDate(point.validatedAt)}</time></article>)}</div>
        </div>
      </section>

      <section className="evolution-dimensions">
        <div className="course-section-heading"><div><p className="eyebrow">Seis dimensiones</p><h2>Qué ha avanzado y dónde mantener el foco</h2></div><span>{previous ? "Comparación disponible" : "Medición inicial"}</span></div>
        <div className="evolution-dimension-grid">{latest.dimensions.map((dimension) => {
          const previousScore = previous?.dimensions.find((item) => item.key === dimension.key)?.score ?? null;
          const delta = scoreDelta(dimension.score, previousScore);
          return <article className="card evolution-dimension" key={dimension.key} style={{ "--dimension-color": dimension.color } as CSSProperties}><header><span>{dimension.code}</span><small>{deltaLabel(delta)}</small></header><h3>{dimension.name}</h3><strong>{dimension.score === null ? "Sin evaluar" : Math.round(dimension.score)}</strong><div><i style={{ width: `${dimension.score ?? 0}%` }} /></div><p>{dimension.score === null ? "Esta dimensión no tuvo respuestas aplicables." : scoreLabel(dimension.score)}</p></article>;
        })}</div>
      </section>

      <section className="card evolution-history-card"><div className="card-head"><div><p className="eyebrow">Registro</p><h2>Diagnósticos conservados</h2></div><span>{timeline.length}</span></div><div className="evolution-history-list">{[...timeline].reverse().map((point, index) => <article key={point.diagnosticId}><span>{timeline.length - index}</span><div><strong>{scoreLabel(point.overallScore)}</strong><small>Snapshot validado · {point.dimensions.filter((dimension) => dimension.score !== null).length} dimensiones evaluadas</small></div><b>{point.overallScore === null ? "—" : Math.round(point.overallScore)}/100</b><time dateTime={point.validatedAt}>{formatDate(point.validatedAt)}</time></article>)}</div></section>
    </main>
  );
}
