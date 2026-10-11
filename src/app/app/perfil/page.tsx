import type { Metadata } from "next";
import { Building2, CheckCircle2 } from "lucide-react";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { saveOrganization } from "./actions";

export const metadata: Metadata = { title: "Mi restaurante" };

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string; bienvenida?: string }>;
};

export default async function CompanyProfilePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");

  const [organization, profileResult, params] = await Promise.all([
    getCurrentOrganization(supabase, userId),
    supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
    searchParams,
  ]);

  return (
    <main className="page-content company-page">
      <div className="page-heading company-heading">
        <div>
          <p className="eyebrow">{organization ? "Perfil del restaurante" : "Primer paso"}</p>
          <h1>{organization ? "Los datos reales de tu restaurante" : "Cuéntanos qué restaurante vamos a acompañar"}</h1>
          <p className="page-description">
            {organization
              ? "Esta información identifica el local y permite que Nexaro trabaje con datos correctos."
              : "Crearemos un espacio privado vinculado a tu cuenta y prepararemos el primer paso del plan."}
          </p>
        </div>
        {organization && <span className="real-data-badge"><CheckCircle2 size={16} /> Restaurante real</span>}
      </div>

      {params.bienvenida && !organization && (
        <div className="onboarding-note"><Building2 size={20} /><div><strong>Tu registro está confirmado.</strong><p>Solo falta crear el perfil del restaurante para entrar al panel.</p></div></div>
      )}

      <section className="card company-form-card" aria-labelledby="company-form-title">
        <div className="company-form-intro">
          <span className="state-visual"><Building2 size={24} /></span>
          <div><h2 id="company-form-title">{organization ? organization.name : "Datos básicos"}</h2><p>Los campos marcados con * son obligatorios.</p></div>
        </div>
        <AuthMessage error={params.error} success={params.success} />
        <form action={saveOrganization} className="company-form">
          {!profileResult.data && <div className="field field-wide"><label htmlFor="fullName">Tu nombre completo *</label><input id="fullName" name="fullName" required minLength={2} maxLength={120} autoComplete="name" /></div>}
          <div className="field"><label htmlFor="name">Nombre comercial *</label><input id="name" name="name" required minLength={2} maxLength={120} defaultValue={organization?.name ?? ""} autoComplete="organization" /></div>
          <div className="field"><label htmlFor="legalName">Razón social</label><input id="legalName" name="legalName" maxLength={160} defaultValue={organization?.legal_name ?? ""} /></div>
          <div className="field"><label htmlFor="taxIdentifier">NIF/CIF</label><input id="taxIdentifier" name="taxIdentifier" maxLength={32} defaultValue={organization?.tax_identifier ?? ""} autoCapitalize="characters" /></div>
          <div className="field"><label htmlFor="sector">Tipo de local</label><input id="sector" name="sector" maxLength={100} defaultValue={organization?.sector ?? ""} placeholder="Ej. bar, restaurante, cafetería" /></div>
          <div className="field"><label htmlFor="employeeCount">Personas en el equipo</label><input id="employeeCount" name="employeeCount" type="number" min={1} max={1000000} defaultValue={organization?.employee_count ?? ""} inputMode="numeric" /></div>
          <div className="field"><label htmlFor="city">Ciudad</label><input id="city" name="city" maxLength={100} defaultValue={organization?.city ?? ""} autoComplete="address-level2" /></div>
          <div className="field"><label htmlFor="country">País *</label><input id="country" name="country" required minLength={2} maxLength={80} defaultValue={organization?.country ?? "España"} autoComplete="country-name" /></div>
          <div className="field field-wide"><label htmlFor="website">Sitio web</label><input id="website" name="website" maxLength={240} defaultValue={organization?.website ?? ""} placeholder="www.tuempresa.com" autoComplete="url" /></div>
          <div className="company-form-actions"><p>Los datos personales y de facturación se gestionan desde Cuenta.</p><SubmitButton pendingLabel="Guardando…">{organization ? "Guardar cambios" : "Crear mi restaurante"}</SubmitButton></div>
        </form>
      </section>
    </main>
  );
}
