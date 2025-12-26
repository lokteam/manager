import { useState, useEffect, useMemo } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Plus, User } from 'lucide-react'
import { accountsApi, type TelegramAccount } from '@/api'
import { useToast, Button } from '@/components/ui'
import { HttpError } from '@/api/http'
import { AccountModal } from '@/components/accounts/AccountModal'
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts'
import { useDialogs } from '@/hooks/useDialogs'
import { useTelegramFolders, useFetchChats, useCreateTelegramFolder, useDeleteTelegramFolder, useRenameTelegramFolder, useBulkAddChatsToFolder, useBulkRemoveChatsFromFolder } from '@/hooks/useTelegram'
import { AccountSwitcher } from './components/AccountSwitcher'
import { FolderList } from './components/FolderList'
import { ChatList } from './components/ChatList'

export function TelegramPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [selectedChatIds, setSelectedChatIds] = useState<number[]>([])
  const [isDragging, setIsDragging] = useState(false)
  
  // Account Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [pendingPhone, setPendingPhone] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<TelegramAccount | null>(null)

  const queryClient = useQueryClient()
  const { success, error } = useToast()

  // Data Fetching
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts()
  const { data: allDialogs = [], isLoading: isLoadingDialogs } = useDialogs()
  const { data: folders = [] } = useTelegramFolders(selectedAccountId)

  // Mutations
  const deleteAccountMutation = useDeleteAccount()
  const fetchChatsMutation = useFetchChats()
  const createFolderMutation = useCreateTelegramFolder()
  const renameFolderMutation = useRenameTelegramFolder()
  const deleteFolderMutation = useDeleteTelegramFolder()
  const bulkAddChatsMutation = useBulkAddChatsToFolder()
  const bulkRemoveChatsMutation = useBulkRemoveChatsFromFolder()

  const handleDropChatsToFolder = (chatIds: number[], folderId: number) => {
    if (selectedAccountId) {
      const telegramIds = chatIds
        .map(id => allDialogs.find(d => d.id === id)?.telegram_id)
        .filter((id): id is number => id !== undefined);

      bulkAddChatsMutation.mutate({
        account_id: selectedAccountId,
        folder_id: folderId,
        chat_ids: telegramIds
      }, {
        onSuccess: () => {
          setSelectedFolderId(folderId);
        }
      })
    }
  };

  const handleRemoveChatsFromFolder = (chatIds: number[], folderId: number) => {
    if (!selectedAccountId) return;

    const telegramIds = chatIds
      .map(id => allDialogs.find(d => d.id === id)?.telegram_id)
      .filter((id): id is number => id !== undefined);

    const folder = folders.find(f => f.id === folderId);
    if (folder && folder.chat_ids) {
      const remainingChats = folder.chat_ids.filter(id => !telegramIds.includes(id));
      
      if (remainingChats.length === 0) {
        if (confirm(`Removing all chats from "${folder.title}" will delete the folder. Proceed?`)) {
          deleteFolderMutation.mutate({ folderId, accountId: selectedAccountId }, {
            onSuccess: () => {
              setSelectedFolderId(null);
            }
          });
        }
        return;
      }
    }

    bulkRemoveChatsMutation.mutate({
      account_id: selectedAccountId,
      folder_id: folderId,
      chat_ids: telegramIds
    });
  };

  // Set default account
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  // Reset folder and selection when account changes
  useEffect(() => {
    setSelectedFolderId(null)
    setSelectedChatIds([])
  }, [selectedAccountId])

  // Reset selection when folder changes
  useEffect(() => {
    setSelectedChatIds([])
  }, [selectedFolderId])

  // Initial sync when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      fetchChatsMutation.mutate({ account_id: selectedAccountId })
    }
  }, [selectedAccountId])

  // Filtering
  const filteredDialogs = useMemo(() => {
    if (!selectedAccountId) return []

    let dialogs = allDialogs.filter((d) => d.account_id === selectedAccountId)

    if (selectedFolderId) {
      const folder = folders.find((f) => f.id === selectedFolderId)
      if (folder && folder.chat_ids) {
        const chatIds = new Set(folder.chat_ids)
        dialogs = dialogs.filter((d) => chatIds.has(d.telegram_id))
      }
    }

    return dialogs
  }, [allDialogs, selectedAccountId, selectedFolderId, folders])

  // Account Mutations
  const createMutation = useMutation({
    mutationFn: accountsApi.createAccount,
    onSuccess: (_, variables) => {
      setPendingPhone(variables.phone)
      setStep('code')
      success('Code requested. Please check your Telegram or SMS.')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to request code')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: accountsApi.confirmAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsModalOpen(false)
      setStep('details')
      setPendingPhone(null)
      success('Account connected successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to connect account')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; username?: string } }) =>
      accountsApi.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setEditingAccount(null)
      setIsModalOpen(false)
      success('Account updated successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update account')
    },
  })

  // Handlers
  const handleAddAccount = () => {
    setEditingAccount(null)
    setStep('details')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAccount(null)
    setStep('details')
    setPendingPhone(null)
  }

  const handleCreateFolder = (title: string) => {
    if (selectedAccountId) {
      createFolderMutation.mutate({ account_id: selectedAccountId, title })
    }
  }

  const handleRenameFolder = (folderId: number, title: string) => {
    if (selectedAccountId) {
      renameFolderMutation.mutate({ account_id: selectedAccountId, folder_id: folderId, title })
    }
  }

  const handleDeleteFolder = (folderId: number) => {
    if (selectedAccountId) {
      deleteFolderMutation.mutate({ folderId, accountId: selectedAccountId })
    }
  }

  const handleDeleteAccount = (id: number) => {
    deleteAccountMutation.mutate(id, {
      onSuccess: () => {
        if (selectedAccountId === id) {
          setSelectedAccountId(accounts.find(a => a.id !== id)?.id || null)
        }
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl h-[calc(100vh-7rem)] flex flex-col gap-8 py-4 items-center text-center overflow-hidden">
      <div className="w-full space-y-8 shrink-0">
        {/* Account Switcher */}
        <div className="space-y-2 max-w-md mx-auto">
          <label className="label text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] opacity-80">Active Telegram Account</label>
          <AccountSwitcher
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            onAddAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>

        {/* Folder List */}
        {selectedAccountId && (
          <div className="space-y-2 w-full">
            <label className="label text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] opacity-80">Folders</label>
            <div className="flex justify-center">
              <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                isDragging={isDragging}
                onSelectFolder={setSelectedFolderId}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onDropChatsToFolder={handleDropChatsToFolder}
                onRemoveChatsFromFolder={handleRemoveChatsFromFolder}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat List */}
      <div className="w-full max-w-2xl flex-1 min-h-0 bg-[var(--color-bg-secondary)] rounded-[2rem] border-2 border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden">
        {selectedAccountId ? (
          <div className="flex-1 overflow-y-auto text-left">
            <ChatList
              chats={filteredDialogs}
              isLoading={isLoadingAccounts || isLoadingDialogs}
              selectedIds={selectedChatIds}
              onSelectionChange={setSelectedChatIds}
              onDraggingChange={setIsDragging}
            />
          </div>
        ) : (
           !isLoadingAccounts && (
            <div className="flex flex-1 flex-col items-center justify-center text-[var(--color-text-secondary)] gap-6 p-12">
              <div className="p-8 rounded-full bg-[var(--color-bg-tertiary)] border-2 border-[var(--color-border)] shadow-inner">
                <User className="h-16 w-16 opacity-20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">No Account Selected</h3>
                <p className="max-w-xs mx-auto">Select a Telegram account from the switcher above to start managing your chats.</p>
              </div>
              <Button onClick={handleAddAccount} variant="secondary" size="lg">
                <Plus className="h-5 w-5" />
                Add Account
              </Button>
            </div>
           )
        )}
      </div>

      {/* Account Modal */}
      <AccountModal
        open={isModalOpen}
        onClose={handleCloseModal}
        step={step}
        phone={pendingPhone}
        account={editingAccount}
        onSubmit={(data) => {
          if (editingAccount) {
            updateMutation.mutate({
              id: editingAccount.id,
              data: { name: data.name, username: data.username },
            })
          } else {
            createMutation.mutate({
              api_id: data.api_id,
              api_hash: data.api_hash,
              phone: data.phone,
            })
          }
        }}
        onConfirm={(code) => {
          if (pendingPhone) {
            confirmMutation.mutate({ phone: pendingPhone, code })
          }
        }}
        isLoading={createMutation.isPending || confirmMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
