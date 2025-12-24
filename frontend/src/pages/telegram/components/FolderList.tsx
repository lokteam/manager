import React, { useRef, useState, useEffect } from 'react';
import type { TelegramFolder } from '@/api/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, X } from 'lucide-react';

interface FolderListProps {
  folders: TelegramFolder[];
  selectedFolderId: number | null;
  isDragging?: boolean;
  onSelectFolder: (id: number) => void;
  onCreateFolder: (title: string) => void;
  onRenameFolder: (id: number, title: string) => void;
  onDeleteFolder: (id: number) => void;
}

const ALL_CHATS_ID = 0;

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedFolderId,
  isDragging,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  const startAutoScroll = (direction: 'left' | 'right') => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = window.setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollBy({ left: direction === 'left' ? -10 : 10, behavior: 'auto' });
      }
    }, 16);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!isDragging) {
      stopAutoScroll();
    }
  }, [isDragging]);

  useEffect(() => {
    return () => stopAutoScroll();
  }, []);

  // Determine the active folder ID.
  const activeId = selectedFolderId ?? ALL_CHATS_ID;

  // Combine the "All Chats" option with the actual folders, avoiding duplicates
  const allItems = React.useMemo(() => {
    const baseItems = [{ id: ALL_CHATS_ID, title: 'All Chats' }];
    const filteredFolders = folders.filter(f => f.id !== ALL_CHATS_ID && f.title !== 'All Chats');
    return [...baseItems, ...filteredFolders];
  }, [folders]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderTitle.trim()) {
      onCreateFolder(newFolderTitle.trim());
      setNewFolderTitle('');
      setIsAdding(false);
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim() && editingId !== null) {
      onRenameFolder(editingId, editTitle.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="relative w-full max-w-2xl group/list no-select">
      {/* Edge Fades */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--color-bg-primary)] to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-bg-primary)] to-transparent z-20 pointer-events-none" />

      <div 
        ref={containerRef}
        className="flex items-center gap-3 overflow-x-auto px-8 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onDragOver={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;

          const x = e.clientX - rect.left;
          const threshold = 80;

          if (x < threshold) {
            startAutoScroll('left');
          } else if (x > rect.width - threshold) {
            startAutoScroll('right');
          } else {
            stopAutoScroll();
          }
        }}
        onDragLeave={() => {
          // Note: dragLeave can trigger when moving between children
          // We'll rely on global dragEnd or specific drop
        }}
        onDrop={() => {
          stopAutoScroll();
        }}
      >
        {allItems.map((folder) => {
          const isActive = activeId === folder.id;
          const isEditing = editingId === folder.id;
          const canDelete = folder.id !== ALL_CHATS_ID;
          const isAllChats = folder.id === ALL_CHATS_ID;
          const isDraggingOverMe = dragOverId === folder.id;
          const shouldShowTrash = isAllChats && (isDraggingOverMe || isDragging) && selectedFolderId !== null && selectedFolderId !== ALL_CHATS_ID;
          
          if (isEditing) {
            return (
              <form key={folder.id} onSubmit={handleRenameSubmit} className="flex items-center gap-2 shrink-0 animate-in fade-in zoom-in-95">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="px-4 py-2 rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-accent)] text-sm font-bold outline-none w-40"
                  onBlur={() => setEditingId(null)}
                />
              </form>
            );
          }

          return (
            <div 
              key={folder.id} 
              className="relative group/folder shrink-0"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverId(folder.id);
              }}
              onDragLeave={() => {
                setDragOverId(null);
              }}
              onDrop={(e) => {
                setDragOverId(null);
                
                const chatIds = JSON.parse(e.dataTransfer.getData('application/json'));
                if (folder.id !== ALL_CHATS_ID) {
                  e.preventDefault();
                  (window as any).onDropChatsToFolder(chatIds, folder.id);
                } else if (selectedFolderId !== null && selectedFolderId !== ALL_CHATS_ID) {
                  e.preventDefault();
                  (window as any).onRemoveChatsFromFolder(chatIds, selectedFolderId);
                }
              }}
            >
              <button
                onClick={() => onSelectFolder(folder.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (folder.id !== ALL_CHATS_ID) {
                    setEditingId(folder.id);
                    setEditTitle(folder.title);
                  }
                }}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all duration-300 border-2 flex items-center gap-2",
                  shouldShowTrash
                    ? "bg-[var(--color-error)] border-[var(--color-error)] text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110"
                    : isDraggingOverMe && folder.id !== ALL_CHATS_ID
                      ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] scale-110 shadow-xl"
                      : isActive 
                        ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] shadow-lg scale-105" 
                        : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
                )}
                title={folder.id !== ALL_CHATS_ID ? "Right click to rename" : ""}
              >
                {shouldShowTrash ? (
                  <>
                    <Trash2 className={cn("h-4 w-4", isDraggingOverMe ? "animate-bounce" : "animate-pulse")} />
                    Remove from Folder
                  </>
                ) : (
                  folder.title
                )}
              </button>
              
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete folder "${folder.title}"?`)) {
                      onDeleteFolder(folder.id);
                    }
                  }}
                  className="absolute -top-3 -right-3 p-1.5 bg-[var(--color-error)] text-white rounded-full opacity-0 group-hover/folder:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {isAdding ? (
          <form onSubmit={handleCreate} className="flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-left-4">
            <input
              autoFocus
              value={newFolderTitle}
              onChange={(e) => setNewFolderTitle(e.target.value)}
              placeholder="Folder name..."
              className="px-4 py-2 rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-accent)] text-sm font-bold outline-none w-40"
              onBlur={() => !newFolderTitle && setIsAdding(false)}
            />
            <button type="submit" className="p-2.5 bg-[var(--color-accent)] text-black rounded-2xl shadow-lg hover:scale-105 transition-transform">
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="p-2.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded-2xl border-2 border-[var(--color-border)] hover:text-[var(--color-error)] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] border-2 border-dashed border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-muted)] transition-all shrink-0 font-black text-sm"
          >
            <Plus className="h-4 w-4" />
            New Folder
          </button>
        )}
      </div>
    </div>
  );
};
