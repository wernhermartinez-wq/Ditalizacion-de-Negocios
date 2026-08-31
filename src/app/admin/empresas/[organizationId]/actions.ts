"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { workCategories } from "@/lib/work";

function field(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function message(organizationId: string, type: "error" | "success", text: string): never {
  redirect(`/admin/empresas/${organizationId}?${new URLSearchParams({ [type]: text })}`);
}

export async function addWorkEntry(organizationId: string, formData: FormData) {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) redirect("/admin");
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (claimsError || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");

  const title = field(formData, "title", 160);
  const description = field(formData, "description", 1200);
  const category = field(formData, "category", 40);
  const completedOn = field(formData, "completedOn", 10);
  const validCategories = new Set(workCategories.map((item) => item.value));
  if (title.length < 3 || !validCategories.has(category as (typeof workCategories)[number]["value"]) || !/^\d{4}-\d{2}-\d{2}$/.test(completedOn)) {
    message(organizationId, "error", "Revisa el título, la categoría y la fecha del trabajo.");
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();
  if (organizationError || !organization) message(organizationId, "error", "La empresa indicada no existe o no está disponible.");

  const { error } = await supabase.from("nexaro_work_entries").insert({
    organization_id: organizationId,
    title,
    description: description || null,
    category,
    completed_on: completedOn,
    created_by: userId,
  });
  if (error) message(organizationId, "error", "No se pudo registrar el trabajo realizado.");

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${organizationId}`);
  revalidatePath("/app/trabajo-nexaro");
  message(organizationId, "success", "Trabajo realizado registrado correctamente.");
}
