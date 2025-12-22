import { Navigate, useLocation } from 'react-router-dom'
import { useUser } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/auth'
import { LoadingScreen } from '@/components/ui'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const { isLoading, isError } = useUser()

  // Not authenticated at all - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Loading user data
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />
  }

  // Error fetching user (likely token expired)
  if (isError) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

