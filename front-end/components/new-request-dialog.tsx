"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { apiFetch, ApiError, fetcher } from "@/lib/api"
import { useDebounce } from "@/lib/use-debounce"
import {
  REQUEST_TYPES,
  URGENCIES,
  type RequestDetail,
  type RequestSummary,
  type RequestType,
  type Urgency,
} from "@/lib/types"
import { StatusBadge } from "@/components/badges"

export function NewRequestDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (req: RequestDetail) => void
}) {
  const [title, setTitle] = useState("")
  const [type, setType] = useState<RequestType>("Incidencia")
  const [urgency, setUrgency] = useState<Urgency>("Media")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const debouncedTitle = useDebounce(title, 400)
  const canSuggest = open && debouncedTitle.trim().length >= 4
  const { data: suggestions } = useSWR<RequestSummary[]>(
    canSuggest
      ? `/requests/suggest?title=${encodeURIComponent(debouncedTitle)}&type=${encodeURIComponent(type)}`
      : null,
    fetcher,
  )

  useEffect(() => {
    if (!open) {
      setTitle("")
      setType("Incidencia")
      setUrgency("Media")
      setBody("")
      setError(null)
    }
  }, [open])

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const created = await apiFetch<RequestSummary>("/requests", {
        method: "POST",
        body: JSON.stringify({ title, type, urgency, body }),
      })
      const detail = await apiFetch<RequestDetail>(`/requests/${created.id}`)
      onCreated(detail)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la solicitud")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nueva solicitud"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Nueva solicitud</h2>
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

        <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
          <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Asunto</span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Describe brevemente el problema o petición"
                  className="input"
                />
              </label>

              {suggestions && suggestions.length > 0 && (
                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Solicitudes similares ya resueltas — quizás encuentres la respuesta aquí:
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-surface px-2.5 py-1.5"
                      >
                        <span className="truncate text-sm">{s.title}</span>
                        <StatusBadge status={s.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Tipo</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as RequestType)}
                    className="select"
                  >
                    {REQUEST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Urgencia</span>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as Urgency)}
                    className="select"
                  >
                    {URGENCIES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Descripción</span>
                <textarea
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="Explica con detalle qué necesitas…"
                  className="textarea"
                />
              </label>

              {error && (
                <p className="rounded-md bg-[#fdeaea] px-3 py-2 text-sm text-danger">{error}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Enviando…" : "Crear solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
