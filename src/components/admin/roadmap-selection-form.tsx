"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function SaveSelectionButton({ selectedCount }: { selectedCount: number }) {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary" type="submit" disabled={pending || selectedCount === 0}>
      {pending ? "Guardando…" : selectedCount === 1 ? "Guardar 1 paso" : `Guardar ${selectedCount} pasos`}
    </button>
  );
}

export function RoadmapSelectionForm({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <form
      action={action}
      onChange={(event) => {
        const form = event.currentTarget;
        setSelectedCount(form.querySelectorAll<HTMLInputElement>('input[name="stepKey"]:checked').length);
      }}
      onSubmit={(event) => {
        const count = new FormData(event.currentTarget).getAll("stepKey").length;
        if (!count || !window.confirm(`¿Confirmas que quieres añadir ${count} ${count === 1 ? "paso" : "pasos"} al recorrido del restaurante?`)) {
          event.preventDefault();
        }
      }}
    >
      {children}
      <div className="admin-plan-catalog-footer">
        <div>
          <strong>{selectedCount ? `${selectedCount} ${selectedCount === 1 ? "paso seleccionado" : "pasos seleccionados"}` : "Aún no has seleccionado ningún paso"}</strong>
          <small>El tilde solo selecciona. Pulsa guardar y confirma para añadirlos al recorrido.</small>
        </div>
        <SaveSelectionButton selectedCount={selectedCount} />
      </div>
    </form>
  );
}
