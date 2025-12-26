import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { DisclaimerModal } from '@/components/DisclaimerModal'

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <DisclaimerModal />
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

