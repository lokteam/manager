import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useUser() {
  const { setUser } = useAuthStore()

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await authApi.getMe()
      setUser(user)
      return user
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await authApi.login(email, password)
      return authApi.getMe()
    },
    onSuccess: (user) => {
      useAuthStore.getState().setUser(user)
      queryClient.setQueryData(['me'], user)
      success('Welcome back!')
      navigate('/telegram')
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        error(err.message)
      } else {
        error('Login failed. Please try again.')
      }
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
    }: {
      email: string
      password: string
      fullName: string
    }) => {
      await authApi.register(email, password, fullName)
    },
    onSuccess: () => {
      success('Account created! Please log in.')
      navigate('/login')
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        error(err.message)
      } else {
        error('Registration failed. Please try again.')
      }
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  return () => {
    logout()
    queryClient.clear()
    navigate('/login')
  }
}

