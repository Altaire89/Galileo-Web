"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { apiFetch, ApiError, fetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import {
  STATUSES,
  type Attachment,
  type RequestDetail,
  type Status,
} from "@/lib/types"
import { StatusBadge, TypeBadge, UrgencyDot } from "@/components/badges"
import { formatTime, initials } from "@/lib/format"

export function RequestThread({
  requestId,
  onBack,
  onChanged,
}: {
  requestId: string
  onBack: () => void
  onChanged: () => void
}) {
  const { user } = useAuth()
  const { data, mutate, isLoading } = useSWR<RequestDetail>(
    `/requests/${requestId}`,
    fetcher,
    { refreshInterval: 4000 },
  )

  const [body, setBody] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const messageCount = data?.messages.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messageCount, requestId])

  async function send() {
    if (!body.trim() && attachments.length === 0) return
    setSending(true)
    setError(null)
    try {
      await apiFetch(`/requests/${requestId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, attachments }),
      })
      setBody("")
      setAttachments([])
      await mutate()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el mensaje")
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(status: Status) {
    await apiFetch(`/requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
    await mutate()
    onChanged()
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: f.size })),
    ])
    if (fileRef.current) fileRef.current.value = ""
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      void send()
    }
  }

  if (isLoading && !data) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
        No se pudo cargar la solicitud.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <button
          onClick={onBack}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          aria-label="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <UrgencyDot urgency={data.urgency} />
            <h2 className="truncate text-sm font-semibold">{data.title}</h2>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <TypeBadge type={data.type} />
            <span className="text-xs text-muted-foreground">
              {data.created_by_name} · {data.urgency}
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="sr-only">Cambiar estado</span>
          <select
            value={data.status}
            onChange={(e) => changeStatus(e.target.value as Status)}
            className="select !w-auto !py-1.5 text-xs font-medium"
            aria-label="Estado de la solicitud"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <div className="mx-auto mb-1 flex items-center gap-2">
            <StatusBadge status={data.status} />
          </div>
          {data.messages.map((m) => {
            const own = m.author_id === user?.id
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${own ? "flex-row-reverse" : ""}`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    m.author_role === "UCA"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title={m.author_name}
                >
                  {initials(m.author_name)}
                </span>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                    own
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-surface"
                  }`}
                >
                  {!own && (
                    <p className="mb-0.5 text-xs font-semibold text-accent">{m.author_name}</p>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.attachments.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {m.attachments.map((a, i) => (
                        <span
                          key={i}
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                            own ? "bg-white/15" : "bg-muted"
                          }`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.5 3.5 0 1 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      own ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-surface px-4 py-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs"
              >
                {a.name}
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-danger"
                  aria-label={`Quitar ${a.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" multiple onChange={onPickFiles} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            aria-label="Adjuntar archivo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.5 3.5 0 1 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Escribe un mensaje…"
            className="textarea max-h-32 min-h-10 flex-1 py-2.5"
          />
          <button
            onClick={() => void send()}
            disabled={sending || (!body.trim() && attachments.length === 0)}
            className="btn-primary size-10 shrink-0 !px-0"
            aria-label="Enviar mensaje"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12l16-8-6 16-3-7-7-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
