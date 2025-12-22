import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'new' | 'contact' | 'ignore' | 'interview' | 'reject' | 'offer'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
    success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
    error: 'bg-[var(--color-error)]/15 text-[var(--color-error)]',
    info: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
    new: 'bg-[var(--color-status-new)]/15 text-[var(--color-status-new)]',
    contact: 'bg-[var(--color-status-contact)]/15 text-[var(--color-status-contact)]',
    ignore: 'bg-[var(--color-status-ignore)]/15 text-[var(--color-status-ignore)]',
    interview: 'bg-[var(--color-status-interview)]/15 text-[var(--color-status-interview)]',
    reject: 'bg-[var(--color-status-reject)]/15 text-[var(--color-status-reject)]',
    offer: 'bg-[var(--color-status-offer)]/15 text-[var(--color-status-offer)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

