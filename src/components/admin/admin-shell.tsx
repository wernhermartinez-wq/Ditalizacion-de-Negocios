"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Building2, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/app/actions";
import { BrandLogo } from "@/components/brand-logo";

export function AdminShell({ children, email, organizationName }: { children: React.ReactNode; email: string; organizationName: string | null }) {
  const pathname = usePathname();
  return (
    <div className="admin-frame">
      <aside className="admin-sidebar">
        <div className="admin-brand"><Link href="/admin" className="brand-logo-link" aria-label="Nexaro, control administrativo"><BrandLogo className="admin-brand-logo" /></Link><small>CONTROL</small></div>
        <div className="admin-authority"><ShieldCheck size={18} /><span><strong>Administración global</strong><small>Todas las empresas</small></span></div>
        <nav aria-label="Navegación administrativa">
          <Link href="/admin" className={pathname === "/admin" ? "active" : ""}><LayoutDashboard size={18} /> Empresas</Link>
          <Link href="/app"><ArrowLeft size={18} /> {organizationName ? `Mi organización · ${organizationName}` : "Espacio de empresa"}</Link>
        </nav>
        <div className="admin-sidebar-footer"><small>{email}</small><form action={logout}><button type="submit"><LogOut size={16} /> Cerrar sesión</button></form></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><Building2 size={18} /><span>Contexto global · Supervisión de empresas</span><b>Datos reales</b></header>
        {children}
      </div>
    </div>
  );
}
