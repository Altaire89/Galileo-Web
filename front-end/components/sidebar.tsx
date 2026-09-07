"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { initials } from "@/lib/format"
import { Logo } from "@/app/login/page"

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Solicitudes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 5h16v11H8l-4 3V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/team",
    label: "Equipo",
    adminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M17 7a3 3 0 0 1 0 6m3.5 6a5.5 5.5 0 0 0-4-5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user, organization, logout } = useAuth()

  const items = NAV.filter((i) => !i.adminOnly || user?.role === "UCA")

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <Logo />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">Nexo Soporte</p>
          <p className="truncate text-xs text-muted-foreground">{organization}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {initials(user?.name ?? "?")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role === "UCA" ? "Administrador" : "Cliente"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 12h9m0 0-3-3m3 3-3 3M4 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
