import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { API_BASE_URL, setToken } from '@/api/http'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()
  const { success } = useToast()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setToken(token)
      authApi.getMe().then((user) => {
        setUser(user)
        queryClient.setQueryData(['me'], user)
        success('Welcome back!')
        navigate('/telegram')
      })
    }
  }, [searchParams, navigate, queryClient, setUser, success])

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="text-center">
        <div className="mb-4 text-3xl font-bold text-[var(--color-accent)]">VacancyMgr</div>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          variant="secondary"
          className="w-full py-6 text-lg font-bold"
          onClick={() => {
            window.location.href = `${API_BASE_URL}/auth/sso/google/login`
          }}
        >
          <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          Continue with Google
        </Button>

        <p className="text-center text-xs text-[var(--color-text-secondary)] opacity-60">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardContent>
    </Card>
  )
}
