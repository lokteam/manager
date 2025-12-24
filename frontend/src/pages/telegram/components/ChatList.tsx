import type { Dialog } from '@/api/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface ChatListProps {
  chats: Dialog[]
  isLoading: boolean
}

export function ChatList({ chats, isLoading }: ChatListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-transparent">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[var(--color-bg-tertiary)]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <EmptyState
        title="No chats found"
        description="There are no chats in this folder yet."
        className="mt-8"
      />
    )
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--color-border)]/30">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={cn(
            'flex cursor-pointer items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-[var(--color-bg-tertiary)]/50 active:bg-[var(--color-bg-tertiary)]',
          )}
        >
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-tertiary)] text-base font-semibold text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-sm">
            {getInitials(chat.name || chat.username || 'U')}
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden gap-0.5">
            <div className="flex items-baseline justify-between">
              <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                {chat.name || chat.username || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span className="truncate opacity-80">
                {chat.name && chat.username ? `@${chat.username}` : chat.entity_type}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
