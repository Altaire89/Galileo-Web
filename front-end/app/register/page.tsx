"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { apiFetch, ApiError } from "@/lib/api"
import { Logo, StyleTag } from "@/app/login/page"

interface InvitePreview {
  email: string
  organization: string
  role: string
}

function RegisterInner() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const router = useRouter()
  const { register } = useAuth()

  const [invite, setInvite] = useState<InvitePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    apiFetch<InvitePreview>(`/auth/invitation/${token}`)
      .then(setInvite)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Invitación no válida"),
      )
  }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(token, name, password)
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta")
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
          <h1 className="text-xl font-semibold tracking-tight">Crear tu cuenta</h1>

          {!token || loadError ? (
            <div className="mt-4">
              <p className="rounded-md bg-[#fdeaea] px-3 py-2 text-sm text-danger">
                {loadError ?? "Falta el token de invitación en el enlace."}
              </p>
              <button
                onClick={() => router.replace("/login")}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                Volver a iniciar sesión
              </button>
            </div>
          ) : !invite ? (
            <p className="mt-4 text-sm text-muted-foreground">Verificando invitación…</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Has sido invitado a <strong className="text-foreground">{invite.organization}</strong>{" "}
                como <strong className="text-foreground">{invite.role === "ORG_ADMIN" ? "Administrador" : invite.role === "GROUP_MANAGER" ? "Responsable de grupo" : "Miembro"}</strong>.
              </p>

              <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Correo</span>
                  <input value={invite.email} disabled className="input opacity-70" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Nombre completo</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="input"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Contraseña</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input"
                  />
                </label>

                {error && (
                  <p className="rounded-md bg-[#fdeaea] px-3 py-2 text-sm text-danger">{error}</p>
                )}

                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Creando…" : "Crear cuenta y entrar"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <StyleTag />
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  )
}
