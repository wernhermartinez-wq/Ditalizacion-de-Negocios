"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const DOCUMENT_PATTERNS = {
  nif: /^\d{8}[A-Z]$/,
  nie: /^[XYZ]\d{7}[A-Z]$/,
  cif: /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/,
} as const;

type IdentificationType = keyof typeof DOCUMENT_PATTERNS;

function field(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function optional(value: string) {
  return value || null;
}

function profileMessage(type: "error" | "success", text: string): never {
  redirect(`/app/configuracion?${new URLSearchParams({ [type]: text }).toString()}`);
}

export async function saveProfileSettings(formData: FormData) {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) redirect("/login");

  const fullName = field(formData, "fullName", 120);
  const identificationType = field(formData, "identificationType", 3).toLowerCase() as IdentificationType;
  const taxIdentifier = field(formData, "taxIdentifier", 32).replace(/[\s-]/g, "").toUpperCase();
  const addressLine1 = field(formData, "addressLine1", 180);
  const addressLine2 = field(formData, "addressLine2", 180);
  const postalCode = field(formData, "postalCode", 12).toUpperCase();
  const city = field(formData, "city", 100);
  const province = field(formData, "province", 100);
  const country = field(formData, "country", 80) || "España";
  const phone = field(formData, "phone", 30);

  if (fullName.length < 2) profileMessage("error", "Indica tu nombre completo.");
  if (!(identificationType in DOCUMENT_PATTERNS)) profileMessage("error", "Selecciona NIF, NIE o CIF.");
  if (!DOCUMENT_PATTERNS[identificationType].test(taxIdentifier)) {
    profileMessage("error", `El ${identificationType.toUpperCase()} no tiene un formato válido.`);
  }
  if (addressLine1.length < 5 || postalCode.length < 3 || city.length < 2 || country.length < 2) {
    profileMessage("error", "Completa la dirección de facturación obligatoria.");
  }
  if (phone && phone.length < 6) profileMessage("error", "Revisa el número de teléfono.");

  const now = new Date().toISOString();
  const { data: existingProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileReadError) profileMessage("error", "No se pudo comprobar tu perfil.");

  const profileResult = existingProfile
    ? await supabase.from("profiles").update({ full_name: fullName, updated_at: now }).eq("user_id", userId)
    : await supabase.from("profiles").insert({ user_id: userId, full_name: fullName });
  if (profileResult.error) profileMessage("error", "No se pudo guardar tu nombre.");

  const billingData = {
    identification_type: identificationType,
    tax_identifier: taxIdentifier,
    address_line_1: addressLine1,
    address_line_2: optional(addressLine2),
    postal_code: postalCode,
    city,
    province: optional(province),
    country,
    phone: optional(phone),
  };
  const { data: existingBilling, error: billingReadError } = await supabase
    .from("billing_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (billingReadError) profileMessage("error", "No se pudieron comprobar los datos de facturación.");

  const { error: billingError } = existingBilling
    ? await supabase.from("billing_profiles").update({ ...billingData, updated_at: now }).eq("user_id", userId)
    : await supabase.from("billing_profiles").insert({ user_id: userId, ...billingData });
  if (billingError) profileMessage("error", "No se pudieron guardar los datos de facturación.");

  revalidatePath("/app", "layout");
  profileMessage("success", "Perfil y datos de facturación actualizados.");
}
