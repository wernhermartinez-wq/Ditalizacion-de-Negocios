"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, Building2, ChartNoAxesCombined, CheckSquare2, ChevronDown,
  ClipboardCheck, FolderKanban, LayoutDashboard, LogOut, Menu, Route,
  Settings2, UserRound, Wrench, X,
  ShieldCheck, ScanSearch,
} from "lucide-react";
import { logout } from "@/app/app/actions";
import { BrandLogo } from "@/components/brand-logo";

const navItems = [
  { href: "/app", label: "Inicio", icon: LayoutDashboard },
  { href: "/app/perfil", label: "Mi empresa", icon: Building2 },
  { href: "/app/configuracion", label: "Mi perfil", icon: UserRound },
  { href: "/app/diagnostico", label: "Diagnóstico", icon: ClipboardCheck },
  { href: "/app/evolucion", label: "Evolución", icon: ChartNoAxesCombined },
  { href: "/app/visibilidad", label: "Visibilidad SEO e IA", icon: ScanSearch },
  { href: "/app/herramientas", label: "Herramientas", icon: Wrench },
  { href: "/app/hoja-de-ruta", label: "Hoja de ruta", icon: Route },
  { href: "/app/tareas", label: "Tareas", icon: CheckSquare2 },
  { href: "/app/cursos", label: "Cursos", icon: BookOpen },
  { href: "/app/trabajo-nexaro", label: "Trabajo de Nexaro", icon: FolderKanban },
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
  const company = organizationName ?? "Configura tu empresa";
  const displayName = fullName ?? (email.split("@")[0] || "Usuario");

  return (
    <div className="app-frame">
      <button className={`nav-scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} aria-label="Cerrar navegación" tabIndex={open ? 0 : -1} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand"><Link href="/app" className="brand-logo-link" aria-label="Nexaro, inicio"><BrandLogo className="sidebar-brand-logo" /></Link><button className="icon-button close-nav" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></div>
        <Link className="org-switcher" href="/app/perfil" onClick={() => setOpen(false)}><span className="org-mark">{initials(company)}</span><span><strong>{company}</strong><small>{organizationName ? "Contexto de empresa" : "Completa los datos reales"}</small></span><ChevronDown size={16} /></Link>
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
