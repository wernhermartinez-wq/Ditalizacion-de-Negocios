"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOOL_STATUSES = new Set(["planned", "trial", "active", "limited", "retiring", "retired"]);
const INTEGRATION_STATUSES = new Set(["planned", "active", "degraded", "broken", "retired"]);
const CRITICALITIES = new Set(["low", "medium", "high"]);

function field(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function optional(value: string) {
  return value || null;
}

function numericField(formData: FormData, key: string, minimum: number, maximum: number) {
  const raw = field(formData, key, 32).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= minimum && value <= maximum ? value : Number.NaN;
}

function toolsMessage(type: "error" | "success", text: string): never {
  redirect(`/app/herramientas?${new URLSearchParams({ [type]: text }).toString()}`);
}

async function getContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) redirect("/login");
  const organization = await getCurrentOrganization(supabase, userId);
  if (!organization) redirect("/app/perfil?bienvenida=1");
  return { supabase, userId, organization };
}

export async function addOrganizationTool(formData: FormData) {
  const { supabase, userId, organization } = await getContext();
  const selectedToolId = field(formData, "toolId", 40);
  const customName = field(formData, "customName", 100);
  const customProvider = field(formData, "customProvider", 100);
  let category = field(formData, "category", 80);
  const usagePurpose = field(formData, "usagePurpose", 500);
  const businessArea = field(formData, "businessArea", 100);
  const ownerName = field(formData, "ownerName", 120);
  const userCount = numericField(formData, "userCount", 1, 1_000_000);
  const monthlyCost = numericField(formData, "monthlyCost", 0, 999_999_999);
  const criticality = field(formData, "criticality", 12);
  const status = field(formData, "status", 12);

  const hasCatalogTool = UUID_PATTERN.test(selectedToolId);
  if (!hasCatalogTool && customName.length < 2) toolsMessage("error", "Elige una herramienta del catálogo o indica su nombre.");
  if (usagePurpose.length < 3 || businessArea.length < 2) toolsMessage("error", "Indica para qué se usa y en qué área del negocio.");
  if (Number.isNaN(userCount) || Number.isNaN(monthlyCost)) toolsMessage("error", "Revisa el número de usuarios y el coste mensual.");
  if (!CRITICALITIES.has(criticality) || !TOOL_STATUSES.has(status)) toolsMessage("error", "Revisa la criticidad y el estado.");

  if (hasCatalogTool) {
    const { data: catalogTool, error } = await supabase
      .from("tool_catalog")
      .select("category")
      .eq("id", selectedToolId)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !catalogTool) toolsMessage("error", "La herramienta seleccionada ya no está disponible.");
    category = catalogTool.category;
  } else if (category.length < 2) {
    toolsMessage("error", "Indica la categoría de la herramienta personalizada.");
  }

  const { error } = await supabase.from("organization_tools").insert({
    organization_id: organization.id,
    tool_id: hasCatalogTool ? selectedToolId : null,
    custom_name: hasCatalogTool ? null : customName,
    custom_provider: hasCatalogTool ? null : optional(customProvider),
    category,
    usage_purpose: usagePurpose,
    business_area: businessArea,
    owner_name: optional(ownerName),
    user_count: userCount,
    monthly_cost: monthlyCost ?? 0,
    currency: "EUR",
    criticality,
    status,
    created_by: userId,
  });

  if (error?.code === "23505") toolsMessage("error", "Esta herramienta ya figura activa en el inventario.");
  if (error) toolsMessage("error", "No se pudo añadir la herramienta.");

  revalidatePath("/app");
  revalidatePath("/app/herramientas");
  toolsMessage("success", "Herramienta añadida al inventario.");
}

export async function updateOrganizationTool(toolId: string, formData: FormData) {
  if (!UUID_PATTERN.test(toolId)) toolsMessage("error", "La herramienta no es válida.");
  const { supabase, organization } = await getContext();
  const usagePurpose = field(formData, "usagePurpose", 500);
  const businessArea = field(formData, "businessArea", 100);
  const ownerName = field(formData, "ownerName", 120);
  const userCount = numericField(formData, "userCount", 1, 1_000_000);
  const monthlyCost = numericField(formData, "monthlyCost", 0, 999_999_999);
  const criticality = field(formData, "criticality", 12);
  const status = field(formData, "status", 12);

  if (usagePurpose.length < 3 || businessArea.length < 2) toolsMessage("error", "Completa el uso y el área de la herramienta.");
  if (Number.isNaN(userCount) || Number.isNaN(monthlyCost)) toolsMessage("error", "Revisa el número de usuarios y el coste mensual.");
  if (!CRITICALITIES.has(criticality) || !TOOL_STATUSES.has(status)) toolsMessage("error", "Revisa la criticidad y el estado.");

  const { error } = await supabase
    .from("organization_tools")
    .update({
      usage_purpose: usagePurpose,
      business_area: businessArea,
      owner_name: optional(ownerName),
      user_count: userCount,
      monthly_cost: monthlyCost ?? 0,
      criticality,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", toolId)
    .eq("organization_id", organization.id);
  if (error) toolsMessage("error", "No se pudo actualizar la herramienta.");

  revalidatePath("/app/herramientas");
  toolsMessage("success", "Herramienta actualizada.");
}

export async function removeOrganizationTool(toolId: string) {
  if (!UUID_PATTERN.test(toolId)) toolsMessage("error", "La herramienta no es válida.");
  const { supabase, organization } = await getContext();
  const { error } = await supabase.from("organization_tools").delete().eq("id", toolId).eq("organization_id", organization.id);
  if (error) toolsMessage("error", "No se pudo quitar la herramienta.");

  revalidatePath("/app");
  revalidatePath("/app/herramientas");
  toolsMessage("success", "Herramienta retirada del inventario.");
}

export async function addToolIntegration(formData: FormData) {
  const { supabase, userId, organization } = await getContext();
  const sourceToolId = field(formData, "sourceToolId", 40);
  const targetToolId = field(formData, "targetToolId", 40);
  const method = field(formData, "method", 120);
  const status = field(formData, "status", 12);
  if (!UUID_PATTERN.test(sourceToolId) || !UUID_PATTERN.test(targetToolId) || sourceToolId === targetToolId) {
    toolsMessage("error", "Selecciona dos herramientas diferentes.");
  }
  if (method.length < 2 || !INTEGRATION_STATUSES.has(status)) toolsMessage("error", "Revisa el método y el estado de la integración.");

  const { data: tools, error: toolsError } = await supabase
    .from("organization_tools")
    .select("id")
    .eq("organization_id", organization.id)
    .in("id", [sourceToolId, targetToolId]);
  if (toolsError || tools?.length !== 2) toolsMessage("error", "Alguna herramienta no pertenece a esta empresa.");

  const { error } = await supabase.from("tool_integrations").insert({
    organization_id: organization.id,
    source_tool_id: sourceToolId,
    target_tool_id: targetToolId,
    method,
    status,
    last_verified_at: status === "active" ? new Date().toISOString() : null,
    created_by: userId,
  });
  if (error?.code === "23505") toolsMessage("error", "Esta conexión ya está registrada.");
  if (error) toolsMessage("error", "No se pudo registrar la integración.");

  revalidatePath("/app/herramientas");
  toolsMessage("success", "Integración registrada.");
}

export async function removeToolIntegration(integrationId: string) {
  if (!UUID_PATTERN.test(integrationId)) toolsMessage("error", "La integración no es válida.");
  const { supabase, organization } = await getContext();
  const { error } = await supabase.from("tool_integrations").delete().eq("id", integrationId).eq("organization_id", organization.id);
  if (error) toolsMessage("error", "No se pudo quitar la integración.");

  revalidatePath("/app/herramientas");
  toolsMessage("success", "Integración retirada.");
}
