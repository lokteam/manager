import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const textareaId = id || props.name

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'input min-h-[100px] resize-y',
            error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
            className
          )}
          {...props}
        />
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

