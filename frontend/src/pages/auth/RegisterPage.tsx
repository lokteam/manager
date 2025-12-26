import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { API_BASE_URL } from '@/api/http'
import { Link } from 'react-router-dom'

export function RegisterPage() {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="text-center">
        <div className="mb-4 text-3xl font-bold text-[var(--color-accent)]">VacancyMgr</div>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start managing your job search today</CardDescription>
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
          Sign up with Google
        </Button>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
