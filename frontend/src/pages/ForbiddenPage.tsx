import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={<ShieldX className="h-16 w-16" />}
        title="Access Forbidden"
        description="You don't have permission to access this resource."
        action={
          <Link to="/kanban">
            <Button>Go to Dashboard</Button>
          </Link>
        }
      />
    </div>
  )
}

