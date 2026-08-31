import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isPlatformAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import "./admin.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) redirect("/login");
  if (!(await isPlatformAdmin(supabase, userId))) redirect("/app");
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "administrador@nexaro.es";
  return <AdminShell email={email}>{children}</AdminShell>;
}
