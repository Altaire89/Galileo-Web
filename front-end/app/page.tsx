"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? "/dashboard" : "/login")
  }, [user, loading, router])

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  )
}
