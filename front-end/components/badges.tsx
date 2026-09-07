import type { Status, Urgency, RequestType } from "@/lib/types"

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Abierta: "bg-[#e7f0ff] text-[#1f6feb]",
    "En progreso": "bg-[#fef3e0] text-[#b45309]",
    Resuelta: "bg-[#e6f6ec] text-[#15803d]",
    Cerrada: "bg-muted text-muted-foreground",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  )
}

export function UrgencyDot({ urgency }: { urgency: Urgency }) {
  const colors: Record<Urgency, string> = {
    Baja: "#94a3b8",
    Media: "#1f6feb",
    Alta: "#d97706",
    Crítica: "#dc2626",
  }
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: colors[urgency] }}
      title={`Urgencia: ${urgency}`}
      aria-label={`Urgencia ${urgency}`}
    />
  )
}

export function TypeBadge({ type }: { type: RequestType }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {type}
    </span>
  )
}
