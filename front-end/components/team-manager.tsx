"use client"

import { useState } from "react"
import useSWR from "swr"
import { apiFetch, ApiError, fetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Invitation, Role, User } from "@/lib/types"
import { initials } from "@/lib/format"

export function TeamManager() {
  const { user } = useAuth()
  const { data: users, mutate: mutateUsers } = useSWR<User[]>("/users", fetcher)
  const { data: invites, mutate: mutateInvites } = useSWR<Invitation[]>(
    "/invitations",
    fetcher,
  )
  const [dialog, setDialog] = useState<null | "add" | "invite">(null)

  const pending = (invites ?? []).filter((i) => !i.accepted)

  async function toggleActive(u: User) {
    await apiFetch(`/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !u.active }),
    })
    void mutateUsers()
  }

  async function changeRole(u: User, role: Role) {
    await apiFetch(`/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    })
    void mutateUsers()
  }

  async function remove(u: User) {
    if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return
    await apiFetch(`/users/${u.id}`, { method: "DELETE" })
    void mutateUsers()
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Equipo</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los usuarios de tu organización.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDialog("invite")} className="btn-secondary">
              Invitar por enlace
            </button>
            <button onClick={() => setDialog("add")} className="btn-primary">
              Añadir usuario
            </button>
          </div>
        </div>

        {/* Users */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          {!users ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {u.name}
                      {u.id === user?.id && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Tú
                        </span>
                      )}
                      {!u.active && (
                        <span className="rounded bg-[#fdeaea] px-1.5 py-0.5 text-[10px] text-danger">
                          Inactivo
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>

                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                    disabled={u.id === user?.id}
                    className="select !w-auto !py-1 text-xs"
                    aria-label={`Rol de ${u.name}`}
                  >
                    <option value="MEMBER">Miembro</option>
                    <option value="ORG_ADMIN">Administrador</option>
                  </select>

                  {u.id !== user?.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(u)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                      >
                        {u.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => remove(u)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-[#fdeaea]"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending invitations */}
        {pending.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold">Invitaciones pendientes</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {pending.map((inv) => (
                <InviteRow key={inv.id} inv={inv} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {dialog === "add" && (
        <AddUserDialog
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null)
            void mutateUsers()
          }}
        />
      )}
      {dialog === "invite" && (
        <InviteDialog
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null)
            void mutateInvites()
          }}
        />
      )}
    </div>
  )
}

function InviteRow({ inv }: { inv: Invitation }) {
  const [copied, setCopied] = useState(false)
  const link =
    typeof window !== "undefined" && inv.token
      ? `${window.location.origin}/register?token=${inv.token}`
      : ""

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{inv.email}</p>
        <p className="truncate text-xs text-muted-foreground">
          {inv.role === "ORG_ADMIN" ? "Administrador" : "Miembro"} · enlace de registro
        </p>
      </div>
      <button
        disabled={!link}
        onClick={() => {
          navigator.clipboard?.writeText(link)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="btn-secondary !py-1 text-xs"
      >
        {copied ? "¡Copiado!" : "Copiar enlace"}
      </button>
    </li>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AddUserDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("MEMBER")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Añadir usuario" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Nombre</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Correo</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Contraseña</span>
            <input
              type="text"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="12 caracteres, mayúscula, minúscula y número"
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Rol</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="select">
              <option value="MEMBER">Miembro</option>
              <option value="ORG_ADMIN">Administrador</option>
            </select>
          </label>
        </div>
        {error && <p className="rounded-md bg-[#fdeaea] px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Creando…" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("MEMBER")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const inv = await apiFetch<Invitation>("/invitations", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      })
      setLink(`${window.location.origin}/register?token=${inv.token}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la invitación")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Invitar por enlace" onClose={onClose}>
      {link ? (
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Comparte este enlace con <strong className="text-foreground">{email}</strong> para que
            cree su cuenta:
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{link}</code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(link)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="btn-secondary !py-1 text-xs"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <div className="flex justify-end">
            <button onClick={onDone} className="btn-primary">
              Hecho
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Correo del invitado</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Rol</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="select">
              <option value="MEMBER">Miembro</option>
              <option value="ORG_ADMIN">Administrador</option>
            </select>
          </label>
          {error && <p className="rounded-md bg-[#fdeaea] px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Generando…" : "Generar enlace"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
