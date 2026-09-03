export const AUTH_FAILURE_MESSAGE = "No hemos podido verificar esos datos de acceso.";
export const AUTH_RATE_LIMIT_MAX_FAILURES = 5;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export type AuthAttemptAction = "login" | "register" | "recover_access";

export function normalizeAuthEmail(email: string) {
  return email.trim().toLocaleLowerCase("es");
}

export function requestIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown").slice(0, 128);
}
