import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => {
            // Headers are applied by proxy.ts; Server Components cannot mutate them.
            void key;
            void value;
          });
        } catch {
          // El proxy actualiza las cookies cuando este cliente se usa en un Server Component.
        }
      },
    },
  });
}
