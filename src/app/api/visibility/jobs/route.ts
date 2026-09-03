import { NextResponse } from "next/server";
import { executeVisibilityRun } from "@/lib/visibility/runner";
import { visibilityProviders, type VisibilityProviderName } from "@/lib/visibility/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const expected = process.env.VISIBILITY_JOB_SECRET;
  const supplied = request.headers.get("x-visibility-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const body = await request.json() as { projectId?: string; idempotencyKey?: string; providers?: string[] };
    if (!body.projectId || !/^[0-9a-f-]{36}$/i.test(body.projectId)) return NextResponse.json({ error: "projectId no válido." }, { status: 400 });
    const idempotencyKey = (body.idempotencyKey ?? request.headers.get("idempotency-key") ?? "").trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 180) return NextResponse.json({ error: "Falta una clave de idempotencia válida." }, { status: 400 });
    const providers = (body.providers ?? []).filter((value): value is VisibilityProviderName => visibilityProviders.includes(value as VisibilityProviderName));
    const result = await executeVisibilityRun({ projectId: body.projectId, idempotencyKey, triggerType: "scheduled", providers });
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo ejecutar el trabajo." }, { status: 500 });
  }
}
