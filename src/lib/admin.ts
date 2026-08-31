import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function isPlatformAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("No se pudo comprobar el acceso administrativo.");
  return Boolean(data);
}
