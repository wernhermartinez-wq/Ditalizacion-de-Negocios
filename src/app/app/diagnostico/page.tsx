import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Plan de mejora" };

export default function DiagnosticPage() {
  redirect("/app/hoja-de-ruta");
}
