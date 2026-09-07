"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { TeamManager } from "@/components/team-manager"

export default function TeamPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !["ORG_ADMIN", "PLATFORM_ADMIN"].includes(user.role)) router.replace("/dashboard")
  }, [user, loading, router])

  if (!user || !["ORG_ADMIN", "PLATFORM_ADMIN"].includes(user.role)) return null

  return <TeamManager />
}
