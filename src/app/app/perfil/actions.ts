"use server";

import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function field(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function optional(value: string) {
  return value || null;
}

function profileMessage(type: "error" | "success", text: string): never {
  redirect(`/app/perfil?${new URLSearchParams({ [type]: text }).toString()}`);
}

export async function saveOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) redirect("/login");

  const name = field(formData, "name", 120);
  const legalName = field(formData, "legalName", 160);
  const taxIdentifier = field(formData, "taxIdentifier", 32).toUpperCase();
  const sector = field(formData, "sector", 100);
  const city = field(formData, "city", 100);
  const country = field(formData, "country", 80) || "España";
  const websiteInput = field(formData, "website", 240);
  const employeeInput = field(formData, "employeeCount", 7);

  if (name.length < 2) profileMessage("error", "Indica el nombre comercial de la empresa.");

  const employeeCount = employeeInput ? Number(employeeInput) : null;
  if (employeeCount !== null && (!Number.isInteger(employeeCount) || employeeCount < 1 || employeeCount > 1_000_000)) {
    profileMessage("error", "El número de personas de la empresa no es válido.");
  }

  let website: string | null = null;
  if (websiteInput) {
    try {
      const parsed = new URL(websiteInput.match(/^https?:\/\//i) ? websiteInput : `https://${websiteInput}`);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("protocol");
      website = parsed.toString();
    } catch {
      profileMessage("error", "Revisa la dirección del sitio web.");
    }
  }

  const { data: existingProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileReadError) profileMessage("error", "No se pudo comprobar tu perfil.");

  if (!existingProfile) {
    const fullName = field(formData, "fullName", 120);
    if (fullName.length < 2) profileMessage("error", "Indica tu nombre completo.");
    const { error } = await supabase.from("profiles").insert({ user_id: userId, full_name: fullName });
    if (error) profileMessage("error", "No se pudo guardar tu nombre.");
  }

  const organizationData = {
    name,
    legal_name: optional(legalName),
    tax_identifier: optional(taxIdentifier),
    sector: optional(sector),
    employee_count: employeeCount,
    city: optional(city),
    country,
    website,
  };

  const currentOrganization = await getCurrentOrganization(supabase, userId);
  if (currentOrganization) {
    if (!['owner', 'nexaro_admin'].includes(currentOrganization.role)) {
      profileMessage("error", "Tu rol no permite modificar los datos de la empresa.");
    }
    const { error } = await supabase
      .from("organizations")
      .update({ ...organizationData, updated_at: new Date().toISOString() })
      .eq("id", currentOrganization.id);
    if (error) profileMessage("error", "No se pudieron actualizar los datos de la empresa.");
  } else {
    const { error } = await supabase
      .from("organizations")
      .insert({ ...organizationData, created_by: userId });
    if (error) profileMessage("error", "No se pudo crear la empresa. Inténtalo de nuevo.");
  }

  profileMessage("success", currentOrganization ? "Datos actualizados correctamente." : "Tu empresa ya está creada y vinculada a tu cuenta.");
}
