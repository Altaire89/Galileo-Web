const TOKEN_KEY = "nexo_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json")
  }
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`/api${path}`, { ...options, headers })

  if (res.status === 204) return undefined as T

  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in data
        ? (data as { detail: unknown }).detail
        : null) ?? "Error inesperado"
    throw new ApiError(
      typeof detail === "string" ? detail : "Error inesperado",
      res.status,
    )
  }

  return data as T
}

// Default SWR fetcher
export const fetcher = <T>(path: string) => apiFetch<T>(path)
