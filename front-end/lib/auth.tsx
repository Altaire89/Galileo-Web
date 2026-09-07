"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { apiFetch, clearToken, getToken, setToken } from "@/lib/api"
import type { User } from "@/lib/types"

interface Session {
  user: User
  organization: string
}

interface AuthContextValue {
  user: User | null
  organization: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (token: string, name: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const data = await apiFetch<Session>("/auth/me")
        if (active) {
          setUser(data.user)
          setOrganization(data.organization)
        }
      } catch {
        clearToken()
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<Session & { token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    setUser(data.user)
    setOrganization(data.organization)
  }, [])

  const register = useCallback(
    async (token: string, name: string, password: string) => {
      const data = await apiFetch<Session & { token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ token, name, password }),
      })
      setToken(data.token)
      setUser(data.user)
      setOrganization(data.organization)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" })
    } catch {
      // ignore network errors on logout
    }
    clearToken()
    setUser(null)
    setOrganization(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, organization, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
