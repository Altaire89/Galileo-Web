"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/api"
import { useDebounce } from "@/lib/use-debounce"
import type { RequestDetail, RequestSummary } from "@/lib/types"
import { RequestList, type ListFilters } from "@/components/request-list"
import { RequestThread } from "@/components/request-thread"
import { NewRequestDialog } from "@/components/new-request-dialog"

export default function DashboardPage() {
  const [filters, setFilters] = useState<ListFilters>({
    query: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const debouncedQuery = useDebounce(filters.query, 350)
  const params = new URLSearchParams()
  if (debouncedQuery) params.set("q", debouncedQuery)
  if (filters.status) params.set("status", filters.status)
  if (filters.dateFrom) params.set("date_from", filters.dateFrom)
  if (filters.dateTo) params.set("date_to", filters.dateTo)
  const key = `/requests${params.toString() ? `?${params}` : ""}`

  const { data, isLoading, mutate } = useSWR<RequestSummary[]>(key, fetcher, {
    refreshInterval: 6000,
    keepPreviousData: true,
  })

  function handleCreated(req: RequestDetail) {
    setShowNew(false)
    setSelectedId(req.id)
    void mutate()
  }

  return (
    <div className="flex h-full">
      {/* List pane */}
      <div
        className={`w-full border-r border-border md:w-[360px] md:shrink-0 lg:w-[380px] ${
          selectedId ? "hidden md:block" : "block"
        }`}
      >
        <RequestList
          items={data}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
          filters={filters}
          setFilters={setFilters}
          onNew={() => setShowNew(true)}
        />
      </div>

      {/* Detail pane */}
      <div className={`min-w-0 flex-1 ${selectedId ? "block" : "hidden md:block"}`}>
        {selectedId ? (
          <RequestThread
            key={selectedId}
            requestId={selectedId}
            onBack={() => setSelectedId(null)}
            onChanged={() => void mutate()}
          />
        ) : (
          <EmptyDetail onNew={() => setShowNew(true)} />
        )}
      </div>

      <NewRequestDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}

function EmptyDetail({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 5h16v11H8l-4 3V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-medium">Selecciona una solicitud</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Elige una conversación de la lista para ver el detalle y responder, o crea una nueva solicitud.
        </p>
      </div>
      <button onClick={onNew} className="btn-primary !py-1.5 text-xs">
        Nueva solicitud
      </button>
    </div>
  )
}
