import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { updatePassword } from "../actions";

export const metadata: Metadata = { title: "Actualizar contraseña" };

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell title="Elige una nueva contraseña" description="Utiliza una contraseña nueva de al menos 8 caracteres." footer={<Link className="text-link" href="/login">Volver al acceso</Link>}>
      <form action={updatePassword} className="form-stack">
        <AuthMessage error={params.error} />
        <div className="field"><label htmlFor="password">Nueva contraseña</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} /></div>
        <div className="field"><label htmlFor="passwordConfirmation">Repite la contraseña</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={8} /></div>
        <SubmitButton pendingLabel="Guardando…">Guardar nueva contraseña</SubmitButton>
      </form>
    </AuthShell>
  );
}
