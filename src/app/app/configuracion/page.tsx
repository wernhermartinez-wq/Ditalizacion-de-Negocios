import type { Metadata } from "next";
import { CheckCircle2, MapPin, ReceiptText, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { createClient } from "@/lib/supabase/server";
import { saveProfileSettings } from "./actions";

export const metadata: Metadata = { title: "Configuración de perfil" };

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function ProfileSettingsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) redirect("/login");

  const [profileResult, billingResult, params] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
    supabase.from("billing_profiles").select("*").eq("user_id", userId).maybeSingle(),
    searchParams,
  ]);
  const billing = billingResult.data;
  const email = typeof claims?.email === "string" ? claims.email : "";

  return (
    <main className="page-content company-page profile-settings-page">
      <div className="page-heading company-heading">
        <div>
          <p className="eyebrow">Tu cuenta</p>
          <h1>Configuración de perfil</h1>
          <p className="page-description">Mantén tus datos personales y de facturación preparados para los futuros servicios de Nexaro.</p>
        </div>
        {billing && <span className="real-data-badge"><CheckCircle2 size={16} /> Perfil completo</span>}
      </div>

      <section className="card company-form-card" aria-labelledby="profile-form-title">
        <div className="company-form-intro">
          <span className="state-visual"><UserRound size={24} /></span>
          <div><h2 id="profile-form-title">Datos del titular</h2><p>Solo tú puedes consultar y modificar esta información.</p></div>
        </div>
        <AuthMessage error={params.error} success={params.success} />
        <form action={saveProfileSettings} className="company-form profile-settings-form">
          <div className="field"><label htmlFor="fullName">Nombre completo *</label><input id="fullName" name="fullName" required minLength={2} maxLength={120} defaultValue={profileResult.data?.full_name ?? ""} autoComplete="name" /></div>
          <div className="field"><label htmlFor="email">Correo de la cuenta</label><input id="email" type="email" value={email} readOnly aria-readonly="true" autoComplete="email" /></div>

          <div className="profile-form-section"><ReceiptText size={19} /><div><h3>Identificación fiscal</h3><p>Se utilizará para emitir futuras facturas.</p></div></div>
          <div className="field"><label htmlFor="identificationType">Tipo de documento *</label><select id="identificationType" name="identificationType" required defaultValue={billing?.identification_type ?? "nif"}><option value="nif">NIF</option><option value="nie">NIE</option><option value="cif">CIF</option></select></div>
          <div className="field"><label htmlFor="taxIdentifier">Número de identificación *</label><input id="taxIdentifier" name="taxIdentifier" required minLength={5} maxLength={32} defaultValue={billing?.tax_identifier ?? ""} autoCapitalize="characters" placeholder="Ej. 12345678Z" /></div>

          <div className="profile-form-section"><MapPin size={19} /><div><h3>Dirección de facturación</h3><p>Completa la dirección legal del titular.</p></div></div>
          <div className="field field-wide"><label htmlFor="addressLine1">Dirección *</label><input id="addressLine1" name="addressLine1" required minLength={5} maxLength={180} defaultValue={billing?.address_line_1 ?? ""} autoComplete="address-line1" placeholder="Calle, número y puerta" /></div>
          <div className="field field-wide"><label htmlFor="addressLine2">Información adicional</label><input id="addressLine2" name="addressLine2" maxLength={180} defaultValue={billing?.address_line_2 ?? ""} autoComplete="address-line2" placeholder="Edificio, local, planta…" /></div>
          <div className="field"><label htmlFor="postalCode">Código postal *</label><input id="postalCode" name="postalCode" required minLength={3} maxLength={12} defaultValue={billing?.postal_code ?? ""} autoComplete="postal-code" /></div>
          <div className="field"><label htmlFor="city">Ciudad *</label><input id="city" name="city" required minLength={2} maxLength={100} defaultValue={billing?.city ?? ""} autoComplete="address-level2" /></div>
          <div className="field"><label htmlFor="province">Provincia</label><input id="province" name="province" maxLength={100} defaultValue={billing?.province ?? ""} autoComplete="address-level1" /></div>
          <div className="field"><label htmlFor="country">País *</label><input id="country" name="country" required minLength={2} maxLength={80} defaultValue={billing?.country ?? "España"} autoComplete="country-name" /></div>
          <div className="field field-wide"><label htmlFor="phone">Teléfono</label><input id="phone" name="phone" type="tel" minLength={6} maxLength={30} defaultValue={billing?.phone ?? ""} autoComplete="tel" /></div>

          <div className="company-form-actions"><p>Estos datos se guardan de forma privada en tu cuenta.</p><SubmitButton pendingLabel="Guardando…">Guardar perfil</SubmitButton></div>
        </form>
      </section>
    </main>
  );
}
