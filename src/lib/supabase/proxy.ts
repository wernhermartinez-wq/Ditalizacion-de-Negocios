import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login", "/registro", "/recuperar-acceso", "/auth"];

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isProtected = ["/app", "/admin"].some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
  );
  const isPublicAuth = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!data?.claims && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("siguiente", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (data?.claims && isPublicAuth && !request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const isAppPath = request.nextUrl.pathname === "/app" || request.nextUrl.pathname.startsWith("/app/");
  const isBillingPath = request.nextUrl.pathname.startsWith("/app/facturacion");
  if (
    data?.claims &&
    isAppPath &&
    !isBillingPath &&
    process.env.STRIPE_BILLING_ENFORCEMENT_ENABLED === "true"
  ) {
    const userId = typeof data.claims.sub === "string" ? data.claims.sub : null;
    if (userId) {
      const { data: membership } = await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const { data: subscription } = membership
        ? await supabase
            .from("stripe_subscriptions")
            .select("access_enabled")
            .eq("organization_id", membership.organization_id)
            .maybeSingle()
        : { data: null };

      if (!subscription?.access_enabled) {
        return NextResponse.redirect(new URL("/app/facturacion", request.url));
      }
    }
  }

  return response;
}
