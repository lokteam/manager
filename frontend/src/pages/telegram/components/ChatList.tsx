import { useRef, useState, useEffect } from 'react'
import type { Dialog } from '@/api/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface ChatListProps {
  chats: Dialog[]
  isLoading: boolean
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
}

export function ChatList({ chats, isLoading, selectedIds, onSelectionChange }: ChatListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const lastMousePos = useRef({ x: 0, y: 0, isModifier: false });

  const scrollIntervalRef = useRef<number | null>(null);

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const startAutoScroll = (direction: 'up' | 'down') => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = window.setInterval(() => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          parent.scrollBy({ top: direction === 'up' ? -15 : 15, behavior: 'auto' });
        }
      }
    }, 16);
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      
      const target = e.target as HTMLElement
      // Don't start selection if clicking on chat items, buttons, or inputs
      if (
        target.closest('.chat-item') || 
        target.closest('button') || 
        target.closest('input') ||
        target.closest('.no-select')
      ) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      // Store global start position
      setStartPos({ x: e.clientX, y: e.clientY })
      setIsSelecting(true)

      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        onSelectionChange([])
      }
    }

    const updateSelection = (currentX: number, currentY: number, isModifier: boolean) => {
      if (!startPos) return

      const x = Math.min(startPos.x, currentX)
      const y = Math.min(startPos.y, currentY)
      const w = Math.abs(startPos.x - currentX)
      const h = Math.abs(startPos.y - currentY)

      setSelectionBox({ x, y, w, h })

      const chatElements = containerRef.current?.querySelectorAll('.chat-item')
      const newlySelectedInThisBox: number[] = []
      
      chatElements?.forEach((el) => {
        const htmlEl = el as HTMLElement
        const elRect = htmlEl.getBoundingClientRect()

        const intersects = (
          x < elRect.right &&
          x + w > elRect.left &&
          y < elRect.bottom &&
          y + h > elRect.top
        )

        if (intersects) {
          newlySelectedInThisBox.push(Number(htmlEl.dataset.id))
        }
      })

      if (isModifier) {
        // Add unique items to existing selection
        const combined = new Set([...selectedIds, ...newlySelectedInThisBox])
        onSelectionChange(Array.from(combined))
      } else {
        onSelectionChange(newlySelectedInThisBox)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting || !startPos) return
      lastMousePos.current = { x: e.clientX, y: e.clientY, isModifier: e.shiftKey || e.metaKey || e.ctrlKey }

      const scrollParent = containerRef.current?.parentElement;
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const threshold = 60;
        if (e.clientY < parentRect.top + threshold) {
          startAutoScroll('up');
        } else if (e.clientY > parentRect.bottom - threshold) {
          startAutoScroll('down');
        } else {
          stopAutoScroll();
        }
      }

      const dist = Math.sqrt(Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2))
      if (dist < 5 && !selectionBox) return

      updateSelection(e.clientX, e.clientY, e.shiftKey || e.metaKey || e.ctrlKey)
    }

    const handleScroll = () => {
      if (isSelecting && startPos) {
        updateSelection(lastMousePos.current.x, lastMousePos.current.y, lastMousePos.current.isModifier)
      }
    }

    const handleMouseUp = () => {

      setIsSelecting(false)
      setSelectionBox(null)
      setStartPos(null)
      stopAutoScroll()
    }

    const scrollParent = containerRef.current?.parentElement
    if (scrollParent) {
      scrollParent.addEventListener('scroll', handleScroll)
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (scrollParent) {
        scrollParent.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      stopAutoScroll()
    }
  }, [isSelecting, startPos, selectedIds, onSelectionChange, selectionBox])

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-transparent">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-[var(--color-bg-tertiary)]" />
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

  const handleDragStart = (e: React.DragEvent, chatId: number) => {
    (window as any).setIsDraggingGlobal?.(true)
    let idsToDrag = selectedIds
    if (!selectedIds.includes(chatId)) {
      idsToDrag = [chatId]
      onSelectionChange([chatId])
    }
    e.dataTransfer.setData('application/json', JSON.stringify(idsToDrag))
    e.dataTransfer.effectAllowed = 'move'
    
    const dragPreview = document.createElement('div')
    dragPreview.className = 'bg-[var(--color-accent)] text-black px-4 py-2 rounded-xl text-sm font-black shadow-2xl border-2 border-black'
    dragPreview.innerText = idsToDrag.length > 1 ? `Moving ${idsToDrag.length} chats` : `Moving chat`
    document.body.appendChild(dragPreview)
    e.dataTransfer.setDragImage(dragPreview, 0, 0)
    setTimeout(() => document.body.removeChild(dragPreview), 0)
  }

  const handleDragEnd = () => {
    (window as any).setIsDraggingGlobal?.(false)
  }

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col divide-y divide-[var(--color-border)]/30 select-none min-h-full px-4 py-2"
    >
      {selectionBox && (
        <div 
          className="fixed border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 z-[100] pointer-events-none rounded-lg shadow-[0_0_15px_rgba(20,184,166,0.3)]"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.w,
            height: selectionBox.h
          }}
        />
      )}

      {chats.map((chat) => {
        const isSelected = selectedIds.includes(chat.id)
        
        return (
          <div
            key={chat.id}
            data-id={chat.id}
            draggable
            onDragStart={(e) => {
              if (selectionBox) {
                e.preventDefault()
                return
              }
              handleDragStart(e, chat.id)
            }}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
              // If we were selecting with marquee, don't trigger click
              if (selectionBox) return

              if (e.shiftKey || e.metaKey || e.ctrlKey) {
                if (isSelected) {
                  onSelectionChange(selectedIds.filter(id => id !== chat.id))
                } else {
                  onSelectionChange([...selectedIds, chat.id])
                }
              } else {
                onSelectionChange([chat.id])
              }
            }}
            className={cn(
              'chat-item flex cursor-pointer items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-[var(--color-bg-tertiary)]/50 active:bg-[var(--color-bg-tertiary)] rounded-2xl',
              isSelected && 'bg-[var(--color-accent)]/10 border-l-4 border-l-[var(--color-accent)]'
            )}
          >
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold border shadow-sm transition-transform",
              isSelected 
                ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] scale-90" 
                : "bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border-[var(--color-border)]"
            )}>
              {getInitials(chat.name || chat.username || 'U')}
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden gap-0.5">
              <div className="flex items-baseline justify-between">
                <span className={cn(
                  "truncate text-sm font-semibold transition-colors",
                  isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                )}>
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
        )
      })}
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
