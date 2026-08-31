import { AppShell } from "@/components/app/app-shell";
import { getCurrentOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import "./app.css";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");
  const email = typeof data.claims.email === "string" ? data.claims.email : "usuario@nexaro.es";
  const userId = typeof data.claims.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");

  const [organization, profileResult, adminResult] = await Promise.all([
    getCurrentOrganization(supabase, userId),
    supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  return (
    <AppShell
      email={email}
      fullName={profileResult.data?.full_name ?? null}
      organizationName={organization?.name ?? null}
      isAdmin={Boolean(adminResult.data)}
    >
      {children}
    </AppShell>
  );
}
