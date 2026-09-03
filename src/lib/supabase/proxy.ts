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

  return response;
}
