import { useState, useEffect, useMemo } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Plus, User } from 'lucide-react'
import { accountsApi, type TelegramAccount } from '@/api'
import { useToast, Button } from '@/components/ui'
import { HttpError } from '@/api/http'
import { AccountModal } from '@/components/accounts/AccountModal'
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts'
import { useDialogs } from '@/hooks/useDialogs'
import { useTelegramFolders, useCreateTelegramFolder, useDeleteTelegramFolder, useRenameTelegramFolder } from '@/hooks/useTelegram'
import { AccountSwitcher } from './components/AccountSwitcher'
import { FolderList } from './components/FolderList'
import { ChatList } from './components/ChatList'

export function TelegramPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  
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
  const createFolderMutation = useCreateTelegramFolder()
  const renameFolderMutation = useRenameTelegramFolder()
  const deleteFolderMutation = useDeleteTelegramFolder()

  // Set default account
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  // Reset folder when account changes
  useEffect(() => {
    setSelectedFolderId(null)
  }, [selectedAccountId])

  // Filtering
  const filteredDialogs = useMemo(() => {
    if (!selectedAccountId) return []

    let dialogs = allDialogs.filter((d) => d.account_id === selectedAccountId)

    if (selectedFolderId) {
      const folder = folders.find((f) => f.id === selectedFolderId)
      if (folder && folder.chat_ids) {
        const chatIds = new Set(folder.chat_ids)
        dialogs = dialogs.filter((d) => chatIds.has(d.id))
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
    <div className="mx-auto max-w-3xl min-h-[calc(100vh-4rem)] flex flex-col gap-12 py-8 items-center text-center">
      <div className="w-full space-y-12">
        {/* Account Switcher */}
        <div className="space-y-4 max-w-md mx-auto">
          <label className="label text-xs font-black uppercase tracking-[0.2em] text-[var(--color-accent)] opacity-80">Active Telegram Account</label>
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
          <div className="space-y-6 w-full">
            <label className="label text-xs font-black uppercase tracking-[0.2em] text-[var(--color-accent)] opacity-80">Folders</label>
            <div className="flex justify-center">
              <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat List */}
      <div className="w-full max-w-2xl flex-1 overflow-hidden bg-[var(--color-bg-secondary)] rounded-[2rem] border-2 border-[var(--color-border)] shadow-2xl flex flex-col">
        {selectedAccountId ? (
          <div className="flex-1 overflow-y-auto text-left">
            <ChatList
              chats={filteredDialogs}
              isLoading={isLoadingAccounts || isLoadingDialogs}
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
