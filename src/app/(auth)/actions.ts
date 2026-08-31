"use server";

import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/admin";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function message(path: string, type: "error" | "success", text: string): never {
  const params = new URLSearchParams({ [type]: text });
  redirect(`${path}?${params.toString()}`);
}

export async function login(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  if (!email || !password) message("/login", "error", "Introduce tu correo y contraseña.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) message("/login", "error", "No hemos podido verificar esos datos de acceso.");
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (userId && (await isPlatformAdmin(supabase, userId))) redirect("/admin");
  redirect("/app");
}

export async function register(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const confirmation = value(formData, "passwordConfirmation");
  if (!email || password.length < 8) message("/registro", "error", "Usa un correo válido y una contraseña de al menos 8 caracteres.");
  if (password !== confirmation) message("/registro", "error", "Las contraseñas no coinciden.");

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/app` },
  });
  if (error) message("/registro", "error", "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.");
  if (data.session) redirect("/app");
  message("/login", "success", "Cuenta creada. Revisa tu correo para confirmar el acceso.");
}

export async function recoverAccess(formData: FormData) {
  const email = value(formData, "email");
  if (!email) message("/recuperar-acceso", "error", "Introduce el correo de tu cuenta.");

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/actualizar-clave`,
  });
  if (error) message("/recuperar-acceso", "error", "No se pudo iniciar la recuperación. Inténtalo de nuevo.");
  message("/recuperar-acceso", "success", "Si existe una cuenta con ese correo, recibirás un enlace para continuar.");
}

export async function updatePassword(formData: FormData) {
  const password = value(formData, "password");
  const confirmation = value(formData, "passwordConfirmation");
  if (password.length < 8 || password !== confirmation) message("/actualizar-clave", "error", "Las contraseñas deben coincidir y tener al menos 8 caracteres.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) message("/actualizar-clave", "error", "El enlace ha caducado o no es válido. Solicita uno nuevo.");
  message("/login", "success", "Contraseña actualizada. Ya puedes iniciar sesión.");
}
