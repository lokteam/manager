import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  FolderPlus,
  FolderMinus,
  RefreshCw,
} from 'lucide-react'
import { foldersApi, dialogsApi, telegramApi, type Folder, type Dialog, type TelegramFolder } from '@/api'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Modal,
  EmptyState,
  Spinner,
  useToast,
  Badge,
  Select,
} from '@/components/ui'
import { HttpError } from '@/api/http'
import { cn } from '@/lib/utils'

const folderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
})

type FolderForm = z.infer<typeof folderSchema>

export function FoldersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [selectedTelegramFolder, setSelectedTelegramFolder] = useState<number | null>(null)

  const queryClient = useQueryClient()
  const { success, error } = useToast()

  // Queries
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.getFolders,
  })

  const { data: telegramFolders, isLoading: tgFoldersLoading } = useQuery({
    queryKey: ['telegramFolders'],
    queryFn: telegramApi.getTelegramFolders,
  })

  const { data: dialogs, isLoading: dialogsLoading } = useQuery({
    queryKey: ['dialogs'],
    queryFn: dialogsApi.getDialogs,
  })

  // Mutations for app folders
  const createFolderMutation = useMutation({
    mutationFn: foldersApi.createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setIsModalOpen(false)
      success('Folder created successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to create folder')
    },
  })

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      foldersApi.updateFolder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setEditingFolder(null)
      setIsModalOpen(false)
      success('Folder updated successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update folder')
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: foldersApi.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setDeleteConfirmId(null)
      success('Folder deleted successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete folder')
    },
  })

  // Telegram folder mutations
  const addChatMutation = useMutation({
    mutationFn: telegramApi.addChatToFolder,
    onSuccess: () => {
      success('Chat added to folder')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to add chat to folder')
    },
  })

  const removeChatMutation = useMutation({
    mutationFn: telegramApi.removeChatFromFolder,
    onSuccess: () => {
      success('Chat removed from folder')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to remove chat from folder')
    },
  })

  const fetchChatsMutation = useMutation({
    mutationFn: telegramApi.fetchChats,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialogs'] })
      success('Chats synced successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to sync chats')
    },
  })

  const openCreateModal = () => {
    setEditingFolder(null)
    setIsModalOpen(true)
  }

  const openEditModal = (folder: Folder) => {
    setEditingFolder(folder)
    setIsModalOpen(true)
  }

  const isLoading = foldersLoading || tgFoldersLoading || dialogsLoading

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Folders & Dialogs</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Organize your Telegram chats and configure parsing scope
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => fetchChatsMutation.mutate({})}
            loading={fetchChatsMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Sync Chats
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* App Folders Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">App Folders</h2>
        {folders?.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-12 w-12" />}
            title="No folders yet"
            description="Create folders to organize your vacancy sources"
            action={
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                Create Folder
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {folders?.map((folder) => (
              <Card key={folder.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-[var(--color-accent)]" />
                    {folder.name}
                  </CardTitle>
                </CardHeader>
                <CardFooter>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(folder)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(folder.id)}
                    className="text-[var(--color-error)] hover:text-[var(--color-error)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Telegram Folders Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Telegram Folders</h2>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          Manage which dialogs belong to each Telegram folder. Select a folder to add or remove chats.
        </p>

        {telegramFolders?.length === 0 ? (
          <Card className="p-6 text-center text-[var(--color-text-secondary)]">
            No Telegram folders found. Create folders in Telegram app first.
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Folder selector */}
            <div className="max-w-xs">
              <Select
                label="Select Telegram Folder"
                value={selectedTelegramFolder?.toString() || ''}
                onChange={(e) => setSelectedTelegramFolder(e.target.value ? Number(e.target.value) : null)}
                options={telegramFolders?.map((f) => ({ value: f.id.toString(), label: f.title })) || []}
                placeholder="Choose a folder..."
              />
            </div>

            {/* Dialogs list with add/remove buttons */}
            {selectedTelegramFolder && (
              <DialogList
                dialogs={dialogs || []}
                folderId={selectedTelegramFolder}
                onAdd={(chatId) => addChatMutation.mutate({ folder_id: selectedTelegramFolder, chat_id: chatId })}
                onRemove={(chatId) => removeChatMutation.mutate({ folder_id: selectedTelegramFolder, chat_id: chatId })}
                isAdding={addChatMutation.isPending}
                isRemoving={removeChatMutation.isPending}
              />
            )}
          </div>
        )}
      </section>

      {/* Create/Edit Modal */}
      <FolderModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingFolder(null)
        }}
        folder={editingFolder}
        onSubmit={(data) => {
          if (editingFolder) {
            updateFolderMutation.mutate({ id: editingFolder.id, data })
          } else {
            createFolderMutation.mutate(data)
          }
        }}
        isLoading={createFolderMutation.isPending || updateFolderMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Folder"
      >
        <p className="text-[var(--color-text-secondary)]">
          Are you sure you want to delete this folder? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirmId && deleteFolderMutation.mutate(deleteConfirmId)}
            loading={deleteFolderMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// Folder Modal Component
interface FolderModalProps {
  open: boolean
  onClose: () => void
  folder: Folder | null
  onSubmit: (data: FolderForm) => void
  isLoading: boolean
}

function FolderModal({ open, onClose, folder, onSubmit, isLoading }: FolderModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FolderForm>({
    resolver: zodResolver(folderSchema),
    defaultValues: folder ? { name: folder.name } : undefined,
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={folder ? 'Edit Folder' : 'Create Folder'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Folder Name"
          placeholder="e.g., Python Jobs"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {folder ? 'Save Changes' : 'Create Folder'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Dialog List Component
interface DialogListProps {
  dialogs: Dialog[]
  folderId: number
  onAdd: (chatId: number) => void
  onRemove: (chatId: number) => void
  isAdding: boolean
  isRemoving: boolean
}

function DialogList({ dialogs, onAdd, onRemove, isAdding, isRemoving }: DialogListProps) {
  if (dialogs.length === 0) {
    return (
      <Card className="p-6 text-center text-[var(--color-text-secondary)]">
        No dialogs found. Sync your chats first.
      </Card>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="max-h-96 overflow-auto">
        {dialogs.map((dialog) => (
          <div
            key={`${dialog.account_id}-${dialog.id}`}
            className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-[var(--color-text-muted)]" />
              <div>
                <p className="font-medium">{dialog.name || `Dialog ${dialog.id}`}</p>
                <div className="flex items-center gap-2">
                  {dialog.username && (
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      @{dialog.username}
                    </span>
                  )}
                  <Badge variant="default">{dialog.entity_type}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAdd(dialog.id)}
                disabled={isAdding || isRemoving}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(dialog.id)}
                disabled={isAdding || isRemoving}
                className="text-[var(--color-error)] hover:text-[var(--color-error)]"
              >
                <FolderMinus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

