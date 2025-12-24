import React, { useRef, useState } from 'react';
import type { TelegramFolder } from '@/api/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, X } from 'lucide-react';

interface FolderListProps {
  folders: TelegramFolder[];
  selectedFolderId: number | null;
  onSelectFolder: (id: number) => void;
  onCreateFolder: (title: string) => void;
  onRenameFolder: (id: number, title: string) => void;
  onDeleteFolder: (id: number) => void;
}

const ALL_CHATS_ID = 0;

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedFolderId,
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
    <div className="flex items-center gap-3 w-full max-w-2xl px-2">
      <div 
        ref={containerRef}
        className="flex-1 flex items-center gap-3 overflow-x-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {allItems.map((folder) => {
          const isActive = activeId === folder.id;
          const isEditing = editingId === folder.id;
          const canDelete = folder.id !== ALL_CHATS_ID;
          
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
            <div key={folder.id} className="relative group/folder shrink-0">
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
                  "px-6 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all duration-300 border-2",
                  isActive 
                    ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] shadow-lg scale-105" 
                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
                )}
                title={folder.id !== ALL_CHATS_ID ? "Right click to rename" : ""}
              >
                {folder.title}
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
