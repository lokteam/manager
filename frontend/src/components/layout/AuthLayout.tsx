import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="w-full max-w-md px-4">
        <Outlet />
      </div>
    </div>
  )
}

