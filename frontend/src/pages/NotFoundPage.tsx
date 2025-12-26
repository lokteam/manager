import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={<FileQuestion className="h-16 w-16" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Link to="/telegram">
            <Button>Go to Dashboard</Button>
          </Link>
        }
      />
    </div>
  )
}
