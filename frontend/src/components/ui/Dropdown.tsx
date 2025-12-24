import { useState, useRef, useEffect, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DropdownContextType {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined)

export interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  width?: string
}

export const Dropdown = ({ trigger, children, align = 'left', width = 'w-48' }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              width
            )}
          >
            <div className="py-1" role="menu" aria-orientation="vertical">
              {children}
            </div>
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  )
}

interface DropdownItemProps {
  onClick: () => void
  children: ReactNode
  className?: string
  danger?: boolean
}

export const DropdownItem = ({ onClick, children, className, danger }: DropdownItemProps) => {
  const context = useContext(DropdownContext)
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
        if (context) {
          context.setIsOpen(false)
        }
      }}
      className={cn(
        'block w-full px-4 py-2 text-left text-sm transition-colors duration-150',
        danger
          ? 'text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]'
          : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]',
        className
      )}
      role="menuitem"
    >
      {children}
    </button>
  )
}
