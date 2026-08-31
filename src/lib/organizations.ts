import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";

export type CurrentOrganization = Tables<"organizations"> & {
  role: Database["public"]["Enums"]["organization_role"];
};

export async function getCurrentOrganization(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CurrentOrganization | null> {
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error("No se pudo cargar la membresía del usuario.");
  if (!membership) return null;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError) throw new Error("No se pudo cargar la empresa del usuario.");
  return { ...organization, role: membership.role };
}
