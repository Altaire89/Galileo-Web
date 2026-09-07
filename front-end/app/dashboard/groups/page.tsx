"use client"

import { useState } from "react"
import useSWR from "swr"
import { apiFetch, ApiError, fetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Group, User } from "@/lib/types"

export default function GroupsPage() {
  const { user } = useAuth()
  const { data: groups, mutate } = useSWR<Group[]>("/groups", fetcher)
  const { data: users } = useSWR<User[]>("/users", fetcher)
  const [name, setName] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const canManage = user?.role === "ORG_ADMIN" || user?.role === "PLATFORM_ADMIN"

  async function createGroup(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await apiFetch("/groups", { method: "POST", body: JSON.stringify({ name }) })
      setName("")
      void mutate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el grupo")
    }
  }

  async function removeGroup(group: Group) {
    if (!confirm(`¿Eliminar el grupo ${group.name}?`)) return
    try {
      await apiFetch(`/groups/${group.id}`, { method: "DELETE" })
      if (selectedId === group.id) setSelectedId(null)
      void mutate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el grupo")
    }
  }

  async function saveGroup(group: Group, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const groupName = form.get("name")
    const memberIds = form.getAll("member_ids") as string[]
    const managerIds = form.getAll("manager_ids") as string[]
    setError(null)
    setSaving(true)
    try {
      await apiFetch(`/groups/${group.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: groupName, member_ids: memberIds, manager_ids: managerIds }),
      })
      await mutate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el grupo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-lg font-semibold tracking-tight">Grupos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada grupo define qué personas pueden ver sus solicitudes y quién las coordina.
        </p>

        {canManage && (
          <form onSubmit={createGroup} className="mt-6 flex gap-2">
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del grupo" className="input" />
            <button type="submit" className="btn-primary shrink-0">Crear grupo</button>
          </form>
        )}
        {error && <p className="mt-3 rounded-md bg-[#fdeaea] px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(groups ?? []).map((group) => (
            <section key={group.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold">{group.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.member_count} miembros · {group.manager_ids.length} responsables
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelectedId(selectedId === group.id ? null : group.id)} className="btn-secondary !px-2.5 !py-1 text-xs">
                      {selectedId === group.id ? "Cerrar" : "Gestionar"}
                    </button>
                    <button type="button" onClick={() => removeGroup(group)} className="text-xs font-medium text-danger hover:underline">Eliminar</button>
                  </div>
                )}
              </div>

              {selectedId === group.id && canManage && (
                <form onSubmit={(event) => saveGroup(group, event)} className="mt-4 border-t border-border pt-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</span>
                    <input name="name" required defaultValue={group.name} className="input" />
                  </label>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Miembros y responsables</p>
                  <div className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
                    {(users ?? []).filter((candidate) => candidate.role !== "PLATFORM_ADMIN" && candidate.org_id === group.org_id).map((candidate) => {
                      const checked = group.member_ids.includes(candidate.id)
                      const manager = group.manager_ids.includes(candidate.id)
                      return (
                        <div key={candidate.id} className="flex items-center gap-2 text-sm">
                          <label className="flex min-w-0 flex-1 items-center gap-2">
                            <input type="checkbox" name="member_ids" value={candidate.id} defaultChecked={checked} />
                            <span className="truncate">{candidate.name}</span>
                          </label>
                          <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <input type="checkbox" name="manager_ids" value={candidate.id} defaultChecked={manager} disabled={!checked} />
                            Responsable
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  <button type="submit" disabled={saving} className="btn-primary mt-4 w-full">
                    {saving ? "Guardando…" : "Guardar miembros y responsables"}
                  </button>
                </form>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
