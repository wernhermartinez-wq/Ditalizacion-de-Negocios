"use client";

import { useFormStatus } from "react-dom";

export function DiagnosticSubmitButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="diagnostic-actions">
      <button className="secondary-action" type="submit" name="intent" value="save" disabled={pending}>
        {pending ? "Guardando…" : "Guardar borrador"}
      </button>
      <button className="button-primary" type="submit" name="intent" value="complete" disabled={pending}>
        {pending ? "Procesando…" : "Finalizar y calcular resultado"}
      </button>
    </div>
  );
}
