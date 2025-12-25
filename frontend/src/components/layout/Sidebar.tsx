import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useLogout } from '@/hooks/useAuth'

const navItems = [
  { to: '/telegram', icon: Send, label: 'Telegram' },
  { to: '/kanban', icon: LayoutDashboard, label: 'Kanban' },
  { to: '/agent', icon: Bot, label: 'Agent' },
  { to: '/prompts', icon: BookOpen, label: 'Prompts' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { user } = useAuthStore()
  const logout = useLogout()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4">
        {!collapsed && (
          <span className="text-lg font-semibold text-[var(--color-accent)]">
            VacancyMgr
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[var(--color-border)] p-2">
        {!collapsed && user && (
          <div className="mb-2 px-3 py-2">
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {user.full_name}
            </p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-error)]',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
