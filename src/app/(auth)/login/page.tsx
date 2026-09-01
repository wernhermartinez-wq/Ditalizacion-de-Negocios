import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordField } from "@/components/auth/password-field";
import { login } from "../actions";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell title="Bienvenido de nuevo" description="Accede al espacio de tu empresa y retoma el siguiente paso." footer={<>¿Aún no tienes cuenta? <Link className="text-link" href="/registro">Crear una cuenta</Link></>}>
      <form action={login} className="form-stack">
        <AuthMessage error={params.error} success={params.success} />
        <div className="field"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@empresa.es" /></div>
        <PasswordField id="password" label="Contraseña" autoComplete="current-password" />
        <div className="form-row"><span /> <Link className="text-link" href="/recuperar-acceso">He olvidado mi contraseña</Link></div>
        <SubmitButton pendingLabel="Comprobando…">Iniciar sesión</SubmitButton>
      </form>
    </AuthShell>
  );
}
