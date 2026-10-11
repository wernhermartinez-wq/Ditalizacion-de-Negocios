import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Plan de mejora" };

export default function TasksPage() {
  redirect("/app/hoja-de-ruta");
}
