"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  id: string;
  label: string;
  name?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  help?: string;
};

export function PasswordField({
  id,
  label,
  name = id,
  autoComplete,
  minLength,
  help,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={helpId}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {help ? <small id={helpId}>{help}</small> : null}
    </div>
  );
}
