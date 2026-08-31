import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/message";
import { SubmitButton } from "@/components/auth/submit-button";
import { recoverAccess } from "../actions";

export const metadata: Metadata = { title: "Recuperar acceso" };

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell title="Recupera el acceso" description="Te enviaremos un enlace seguro para elegir una nueva contraseña." footer={<Link className="text-link" href="/login">Volver a iniciar sesión</Link>}>
      <form action={recoverAccess} className="form-stack">
        <AuthMessage error={params.error} success={params.success} />
        <div className="field"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@empresa.es" /></div>
        <SubmitButton pendingLabel="Enviando enlace…">Enviar enlace de recuperación</SubmitButton>
      </form>
    </AuthShell>
  );
}
