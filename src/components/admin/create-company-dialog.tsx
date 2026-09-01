"use client";

import { useRef } from "react";
import { Building2, Plus, X } from "lucide-react";
import { registerCompany } from "@/app/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";

export function CreateCompanyDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button className="admin-create-button" type="button" onClick={() => dialogRef.current?.showModal()}>
        <Plus size={16} /> Crear empresa
      </button>
      <dialog className="admin-company-dialog" ref={dialogRef} onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}>
        <div className="admin-company-dialog-card">
          <header>
            <span><Building2 size={20} /></span>
            <div><p>Alta manual</p><h2>Crear una empresa</h2></div>
            <button aria-label="Cerrar formulario" type="button" onClick={() => dialogRef.current?.close()}><X size={18} /></button>
          </header>
          <form action={registerCompany} className="admin-company-form">
            <p className="admin-company-form-intro">Registra el contacto inicial. No se crea una contraseña: el acceso se vinculará cuando la persona se registre con este correo.</p>
            <label><span>Nombre del contacto</span><input name="contactName" autoComplete="name" minLength={2} maxLength={120} placeholder="Ana García" required /></label>
            <label><span>Empresa</span><input name="companyName" autoComplete="organization" minLength={2} maxLength={120} placeholder="Nombre comercial" required /></label>
            <label><span>Correo electrónico</span><input name="email" type="email" autoComplete="email" maxLength={320} placeholder="ana@empresa.com" required /></label>
            <div className="admin-company-form-actions">
              <button type="button" onClick={() => dialogRef.current?.close()}>Cancelar</button>
              <SubmitButton pendingLabel="Creando alta…">Crear alta</SubmitButton>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
