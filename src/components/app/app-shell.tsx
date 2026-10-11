"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2, ChevronDown, FolderKanban, LayoutDashboard, LogOut, Menu, Route,
  Settings2, X, ShieldCheck,
} from "lucide-react";
import { logout } from "@/app/app/actions";
import { BrandLogo } from "@/components/brand-logo";

const navItems = [
  { href: "/app", label: "Inicio", icon: LayoutDashboard },
  { href: "/app/perfil", label: "Mi restaurante", icon: Building2 },
  { href: "/app/hoja-de-ruta", label: "Plan de mejora", icon: Route },
  { href: "/app/trabajo-nexaro", label: "Trabajo realizado", icon: FolderKanban },
  { href: "/app/configuracion", label: "Cuenta", icon: Settings2 },
] as const;

type AppShellProps = {
  children: React.ReactNode;
  email: string;
  fullName: string | null;
  organizationName: string | null;
  isAdmin: boolean;
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : parts[0]?.slice(0, 2) || "NX").toUpperCase();
}

export function AppShell({ children, email, fullName, organizationName, isAdmin }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeLabel = navItems.find((item) => item.href === pathname)?.label ?? "Inicio";
  const company = organizationName ?? "Configura tu restaurante";
  const displayName = fullName ?? (email.split("@")[0] || "Usuario");

  return (
    <div className="app-frame">
      <button className={`nav-scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} aria-label="Cerrar navegación" tabIndex={open ? 0 : -1} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand"><Link href="/app" className="brand-logo-link" aria-label="Nexaro, inicio"><BrandLogo className="sidebar-brand-logo" /></Link><button className="icon-button close-nav" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></div>
        <Link className="org-switcher" href="/app/perfil" onClick={() => setOpen(false)}><span className="org-mark">{initials(company)}</span><span><strong>{company}</strong><small>{organizationName ? "Tu restaurante" : "Completa los datos del local"}</small></span><ChevronDown size={16} /></Link>
        <nav className="main-nav" aria-label="Navegación principal">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-footer">
          {isAdmin && <Link className="admin-entry-link" href="/admin"><ShieldCheck size={17} /> Administración global</Link>}
          <div className="user-summary"><span className="avatar">{initials(displayName)}</span><span><strong>{displayName}</strong><small>{email}</small></span></div>
          <form action={logout}><button className="signout" type="submit"><LogOut size={17} /> Cerrar sesión</button></form>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar"><button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button><div><small>{company.toUpperCase()}</small><strong>{activeLabel}</strong></div><Link className="icon-button" href="/app/configuracion" aria-label="Configuración de perfil"><Settings2 size={20} /></Link></header>
        {children}
      </div>
    </div>
  );
}
