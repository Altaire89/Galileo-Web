export function getToken(): string | null {
  return null
}

export function setToken(token: string) {
  void token
}

export function clearToken() {
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
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(`/api${path}`, { ...options, headers, credentials: "include" })

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
