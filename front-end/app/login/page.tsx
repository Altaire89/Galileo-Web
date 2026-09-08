"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { ApiError } from "@/lib/api"
import { SiteFooter } from "@/components/site-footer"

const DEMO = [
  { label: "Admin · Acme Corp", email: "admin@acme.com" },
  { label: "Cliente · Acme Corp", email: "user@acme.com" },
  { label: "Admin · Globex", email: "admin@globex.com" },
]

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard")
  }, [user, loading, router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">Nexo Soporte</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accede al portal de soporte de tu organización.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="Correo corporativo">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                className="input"
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </Field>

            {error && (
              <p className="rounded-md bg-[#fdeaea] px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Cuentas de demostración (contraseña: <code className="font-mono">password123</code>)
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email)
                  setPassword("password123")
                }}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span>{d.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <StyleTag />
        <SiteFooter />
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

export function Logo() {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7h16M4 12h10M4 17h7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function StyleTag() {
  return (
    <style jsx global>{`
      .input {
        width: 100%;
        border-radius: 0.5rem;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        padding: 0.55rem 0.75rem;
        font-size: 0.875rem;
        outline: none;
      }
      .input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.15);
      }
      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border-radius: 0.5rem;
        background: var(--color-primary);
        color: var(--color-primary-foreground);
        padding: 0.55rem 0.9rem;
        font-size: 0.875rem;
        font-weight: 600;
        transition: opacity 0.15s ease;
      }
      .btn-primary:hover {
        opacity: 0.92;
      }
      .btn-primary:disabled {
        opacity: 0.6;
      }
    `}</style>
  )
}
