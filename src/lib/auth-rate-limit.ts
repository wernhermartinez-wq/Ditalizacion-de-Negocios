import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
export {
  AUTH_FAILURE_MESSAGE,
  requestIp,
  type AuthAttemptAction,
} from "@/lib/auth-rate-limit-policy";
import {
  AUTH_RATE_LIMIT_MAX_FAILURES,
  AUTH_RATE_LIMIT_WINDOW_MS,
  normalizeAuthEmail,
  type AuthAttemptAction,
} from "@/lib/auth-rate-limit-policy";

export async function isAuthRateLimited(email: string, now = new Date()) {
  const since = new Date(now.getTime() - AUTH_RATE_LIMIT_WINDOW_MS).toISOString();
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", normalizeAuthEmail(email))
    .gte("created_at", since);

  if (error) throw new Error("No se pudo comprobar el límite de autenticación.", { cause: error });
  return (count ?? 0) >= AUTH_RATE_LIMIT_MAX_FAILURES;
}

export async function recordAuthFailure(email: string, ip: string, action: AuthAttemptAction) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("auth_attempts").insert({
    email: normalizeAuthEmail(email),
    ip,
    action,
  });

  if (error) throw new Error("No se pudo registrar el intento de autenticación.", { cause: error });
}
