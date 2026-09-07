"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { TeamManager } from "@/components/team-manager"

export default function TeamPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && user.role !== "UCA") router.replace("/dashboard")
  }, [user, loading, router])

  if (!user || user.role !== "UCA") return null

  return <TeamManager />
}
