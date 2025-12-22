import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout, AuthLayout, RequireAuth } from '@/components/layout'
import { LoginPage, RegisterPage } from '@/pages/auth'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { AccountsPage } from '@/pages/accounts/AccountsPage'
import { FoldersPage } from '@/pages/folders/FoldersPage'
import { AgentPage } from '@/pages/agent/AgentPage'
import { KanbanPage } from '@/pages/kanban/KanbanPage'

export const router = createBrowserRouter([
  // Public auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // Protected app routes
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <Navigate to="/kanban" replace /> },
      { path: '/kanban', element: <KanbanPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/folders', element: <FoldersPage /> },
      { path: '/agent', element: <AgentPage /> },
    ],
  },

  // Error pages
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
])
