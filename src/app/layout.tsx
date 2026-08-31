import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NEXARO", template: "%s · NEXARO" },
  description: "Plataforma de madurez digital para autónomos y pymes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
