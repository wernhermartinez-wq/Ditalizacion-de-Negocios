import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { register } from "../actions";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell title="Crea tu espacio" description="Empieza con tu cuenta. La empresa y sus colaboradores se configurarán en el siguiente paso." footer={<>¿Ya tienes cuenta? <Link className="text-link" href="/login">Iniciar sesión</Link></>}>
      <form action={register} className="form-stack">
        <AuthMessage error={params.error} />
        <div className="field"><label htmlFor="email">Correo profesional</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@empresa.es" /></div>
        <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-help" /><small id="password-help">Mínimo 8 caracteres.</small></div>
        <div className="field"><label htmlFor="passwordConfirmation">Repite la contraseña</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={8} /></div>
        <SubmitButton pendingLabel="Creando cuenta…">Crear cuenta</SubmitButton>
      </form>
    </AuthShell>
  );
}
