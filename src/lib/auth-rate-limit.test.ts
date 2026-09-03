import { describe, expect, it } from "vitest";
import {
  AUTH_RATE_LIMIT_MAX_FAILURES,
  AUTH_RATE_LIMIT_WINDOW_MS,
  normalizeAuthEmail,
  requestIp,
} from "./auth-rate-limit-policy";

describe("auth rate limit", () => {
  it("normaliza el correo usado como clave del límite", () => {
    expect(normalizeAuthEmail("  CLIENTE@Ejemplo.ES ")).toBe("cliente@ejemplo.es");
  });

  it("prioriza la primera IP reenviada y limita su longitud", () => {
    const headers = new Headers({ "x-forwarded-for": ` 203.0.113.8, 10.0.0.1` });
    expect(requestIp(headers)).toBe("203.0.113.8");
    expect(requestIp(new Headers({ "x-real-ip": "x".repeat(200) }))).toHaveLength(128);
  });

  it("mantiene la política acordada", () => {
    expect(AUTH_RATE_LIMIT_MAX_FAILURES).toBe(5);
    expect(AUTH_RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
  });
});
