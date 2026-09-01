import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordField } from "@/components/auth/password-field";
import { updatePassword } from "../actions";

export const metadata: Metadata = { title: "Actualizar contraseña" };

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell title="Elige una nueva contraseña" description="Utiliza una contraseña nueva de al menos 8 caracteres." footer={<Link className="text-link" href="/login">Volver al acceso</Link>}>
      <form action={updatePassword} className="form-stack">
        <AuthMessage error={params.error} />
        <PasswordField id="password" label="Nueva contraseña" autoComplete="new-password" minLength={8} />
        <PasswordField id="passwordConfirmation" label="Repite la contraseña" autoComplete="new-password" minLength={8} />
        <SubmitButton pendingLabel="Guardando…">Guardar nueva contraseña</SubmitButton>
      </form>
    </AuthShell>
  );
}
