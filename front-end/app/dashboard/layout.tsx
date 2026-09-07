"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <Sidebar />
      </aside>

      {/* Mobile slide-over sidebar */}
      {mobileNav && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileNav(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileNav(true)}
            className="flex size-9 items-center justify-center rounded-lg border border-border"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold">Nexo Soporte</span>
        </header>

        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
