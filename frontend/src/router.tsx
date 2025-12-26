import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout, AuthLayout, RequireAuth } from '@/components/layout'
import { LoginPage, RegisterPage } from '@/pages/auth'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { AgentPage } from '@/pages/agent/AgentPage'
import { VacanciesPage } from '@/pages/vacancies/VacanciesPage'
import { TelegramPage } from '@/pages/telegram/TelegramPage'
import { PromptsPage } from '@/pages/prompts/PromptsPage'

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
      { path: '/', element: <Navigate to="/telegram" replace /> },
      { path: '/telegram', element: <TelegramPage /> },
      { path: '/vacancies', element: <VacanciesPage /> },
      { path: '/agent', element: <AgentPage /> },
      { path: '/prompts', element: <PromptsPage /> },
    ],
  },

  // Error pages
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
])
