"use server";

import { redirect } from "next/navigation";

export async function reopenDiagnostic() {
  redirect("/app/hoja-de-ruta");
}

export async function saveDiagnostic() {
  redirect("/app/hoja-de-ruta");
}
