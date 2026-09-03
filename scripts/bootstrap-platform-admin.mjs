import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();

if (!url || !secretKey || !ownerEmail) {
  throw new Error(
    "Configura NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y PLATFORM_ADMIN_EMAIL antes del bootstrap.",
  );
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let owner = null;
for (let page = 1; !owner; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  owner = data.users.find((user) => user.email?.toLowerCase() === ownerEmail) ?? null;
  if (data.users.length < 100) break;
}

if (!owner) throw new Error("No existe un usuario de Auth con PLATFORM_ADMIN_EMAIL.");

const { error: adminError } = await supabase.from("platform_admins").upsert({
  user_id: owner.id,
  granted_by: owner.id,
});
if (adminError) throw adminError;

const { data: existingOrganization, error: organizationLookupError } = await supabase
  .from("organizations")
  .select("id")
  .eq("name", "Nexaro")
  .eq("created_by", owner.id)
  .maybeSingle();
if (organizationLookupError) throw organizationLookupError;

let organizationId = existingOrganization?.id;
if (!organizationId) {
  const { data: organization, error } = await supabase
    .from("organizations")
    .insert({ name: "Nexaro", created_by: owner.id })
    .select("id")
    .single();
  if (error) throw error;
  organizationId = organization.id;
}

const { error: membershipError } = await supabase.from("organization_memberships").upsert({
  organization_id: organizationId,
  user_id: owner.id,
  role: "owner",
});
if (membershipError) throw membershipError;

console.info("Bootstrap completado: administrador y organización Nexaro preparados.");
