import type { ApiError } from './types'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuth?: boolean
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const data = await response.json()
    return {
      status: response.status,
      message: data.detail || data.message || response.statusText,
      details: data.errors,
    }
  } catch {
    return {
      status: response.status,
      message: response.statusText,
    }
  }
}

export async function http<T>(
  endpoint: string,
  { body, skipAuth, headers: customHeaders, ...options }: RequestOptions = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...customHeaders,
  }

  if (body && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  const isAuthEndpoint = endpoint.startsWith('/auth') || endpoint.startsWith('/users/me')
  const url = isAuthEndpoint ? `${API_BASE_URL}${endpoint}` : `${API_BASE_URL}/api/v1${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers,
    body: body instanceof FormData || body instanceof URLSearchParams
      ? body
      : body
        ? JSON.stringify(body)
        : undefined,
  })

  if (!response.ok) {
    const error = await parseErrorResponse(response)

    // Handle 401 - clear token and redirect
    if (response.status === 401) {
      clearToken()
      // Only redirect if we're not already on auth pages
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }

    throw new HttpError(error.status, error.message, error.details)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    http<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    http<T>(endpoint, { ...options, method: 'POST', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    http<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    http<T>(endpoint, { ...options, method: 'DELETE' }),
}

