import { api, setToken } from './http'
import type { AuthResponse, User } from './types'

export async function register(email: string, password: string, fullName: string): Promise<void> {
  const params = new URLSearchParams({
    email,
    password,
    full_name: fullName,
  })
  await api.post(`/auth/register?${params.toString()}`, undefined, { skipAuth: true })
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const body = new URLSearchParams({
    username: email,
    password,
  })

  const response = await api.post<AuthResponse>('/auth/login', body, {
    skipAuth: true,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  setToken(response.access_token)
  return response
}

export async function getMe(): Promise<User> {
  return api.get<User>('/users/me')
}

