"use client";

import { useEffect, useState } from "react";
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
  formId,
  availableCount,
}: {
  action: (formData: FormData) => void | Promise<void>;
  formId: string;
  availableCount: number;
}) {
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const selector = `input[form="${formId}"][name="stepKey"]`;
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(selector));
    const updateCount = () => setSelectedCount(inputs.filter((input) => input.checked).length);
    inputs.forEach((input) => input.addEventListener("change", updateCount));
    updateCount();
    return () => inputs.forEach((input) => input.removeEventListener("change", updateCount));
  }, [formId, availableCount]);

  return (
    <form
      id={formId}
      action={action}
      onSubmit={(event) => {
        const count = new FormData(event.currentTarget).getAll("stepKey").length;
        if (!count || !window.confirm(`¿Confirmas que quieres añadir ${count} ${count === 1 ? "paso" : "pasos"} al recorrido del restaurante?`)) {
          event.preventDefault();
        }
      }}
    >
      <div className="admin-plan-catalog-footer">
        <div>
          <strong>{availableCount === 0 ? "Todas las fases ya fueron revisadas" : selectedCount ? `${selectedCount} ${selectedCount === 1 ? "paso seleccionado" : "pasos seleccionados"}` : "Selecciona los siguientes pasos"}</strong>
          <small>{availableCount === 0 ? "Puedes abrir cualquier paso para actualizarlo." : "El tilde solo selecciona. Pulsa guardar y confirma para añadirlos al recorrido."}</small>
        </div>
        {availableCount > 0 && <SaveSelectionButton selectedCount={selectedCount} />}
      </div>
    </form>
  );
}
