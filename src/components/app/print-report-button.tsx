"use client";

import { Printer } from "lucide-react";

export function PrintReportButton() {
  return <button className="secondary-action no-print" type="button" onClick={() => window.print()}><Printer size={16} /> Imprimir o guardar PDF</button>;
}
