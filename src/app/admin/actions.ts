"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function message(type: "error" | "success", text: string): never {
  redirect(`/admin?${new URLSearchParams({ [type]: text })}`);
}

export async function registerCompany(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const contactName = field(formData, "contactName", 120);
  const companyName = field(formData, "companyName", 120);
  const email = field(formData, "email", 320).toLowerCase();
  if (contactName.length < 2 || companyName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    message("error", "Revisa el nombre, la empresa y el correo electrónico.");
  }

  const { error } = await supabase.rpc("admin_register_company", {
    p_contact_name: contactName,
    p_company_name: companyName,
    p_email: email,
  });

  if (error) {
    const details = `${error.message} ${error.details ?? ""}`.toLowerCase();
    if (details.includes("alta activa")) message("error", "Ya existe un alta activa para este correo.");
    if (details.includes("vinculado a una empresa")) message("error", "Este correo ya pertenece a una empresa registrada.");
    message("error", "No se pudo crear el alta. Inténtalo de nuevo.");
  }

  revalidatePath("/admin");
  message("success", "Alta creada. Si el correo aún no tiene cuenta, quedará pendiente hasta que se registre.");
}
