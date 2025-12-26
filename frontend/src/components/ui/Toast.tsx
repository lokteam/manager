import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastContext, type ToastType, type ToastContextValue } from './use-toast'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message, duration }])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const value: ToastContextValue = {
    toast: addToast,
    success: (msg, dur) => addToast('success', msg, dur),
    error: (msg, dur) => addToast('error', msg, dur),
    info: (msg, dur) => addToast('info', msg, dur),
    warning: (msg, dur) => addToast('warning', msg, dur),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => setIsExiting(true), toast.duration - 300)
      return () => clearTimeout(timer)
    }
  }, [toast.duration])

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />,
    error: <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />,
    info: <Info className="h-5 w-5 text-[var(--color-info)]" />,
    warning: <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />,
  }

  const bgColors = {
    success: 'border-[var(--color-success)]/30',
    error: 'border-[var(--color-error)]/30',
    info: 'border-[var(--color-info)]/30',
    warning: 'border-[var(--color-warning)]/30',
  }

  return (
    <div
      className={cn(
        'flex w-80 items-start gap-3 rounded-lg border bg-[var(--color-bg-secondary)] p-4 shadow-lg transition-all duration-300',
        bgColors[toast.type],
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-[var(--color-text-primary)]">{toast.message}</p>
      <button
        onClick={onClose}
        className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
