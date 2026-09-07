"use client"

import { useState } from "react"
import { STATUSES, type RequestSummary, type Status } from "@/lib/types"
import { StatusBadge, TypeBadge, UrgencyDot } from "@/components/badges"
import { relativeTime } from "@/lib/format"

export interface ListFilters {
  query: string
  status: Status | ""
  dateFrom: string
  dateTo: string
}

export function RequestList({
  items,
  isLoading,
  selectedId,
  onSelect,
  filters,
  setFilters,
  onNew,
}: {
  items: RequestSummary[] | undefined
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  filters: ListFilters
  setFilters: (f: ListFilters) => void
  onNew: () => void
}) {
  const [showFilters, setShowFilters] = useState(false)
  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">Solicitudes</h1>
          <button onClick={onNew} className="btn-primary !px-3 !py-1.5 text-xs">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Nueva
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Buscar por palabra clave…"
              className="input !py-1.5 pl-8 text-sm"
              aria-label="Buscar solicitudes"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`flex size-9 items-center justify-center rounded-lg border border-border ${
              hasActiveFilters ? "text-primary" : "text-muted-foreground"
            } hover:bg-muted`}
            aria-label="Filtros"
            aria-pressed={showFilters}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as Status | "" })}
                className="select !py-1.5 text-sm"
              >
                <option value="">Todos</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Desde</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="input !py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="input !py-1.5 text-sm"
                />
              </label>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ ...filters, status: "", dateFrom: "", dateTo: "" })}
                className="self-start text-xs font-medium text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {isLoading && !items ? (
          <ListSkeleton />
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-6 py-16 text-center">
            <p className="text-sm font-medium">Sin resultados</p>
            <p className="text-xs text-muted-foreground">
              {filters.query || hasActiveFilters
                ? "Prueba con otros términos o filtros."
                : "Crea tu primera solicitud para empezar."}
            </p>
          </div>
        ) : (
          <ul>
            {items.map((r) => {
              const active = r.id === selectedId
              return (
                <li key={r.id}>
                  <button
                    onClick={() => onSelect(r.id)}
                    className={`flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors ${
                      active ? "bg-primary/8" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UrgencyDot urgency={r.urgency} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {relativeTime(r.last_activity)}
                      </span>
                    </div>
                    <p className="truncate pl-4 text-xs text-muted-foreground">
                      {r.last_message || "Sin mensajes"}
                    </p>
                    <div className="flex items-center gap-1.5 pl-4 pt-0.5">
                      <StatusBadge status={r.status} />
                      <TypeBadge type={r.type} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 border-b border-border px-4 py-3.5">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
