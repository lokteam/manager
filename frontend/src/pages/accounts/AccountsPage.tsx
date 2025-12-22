import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Smartphone, Pencil, Trash2, Phone } from 'lucide-react'
import { accountsApi, type TelegramAccount } from '@/api'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  EmptyState,
  Spinner,
  useToast,
} from '@/components/ui'
import { HttpError } from '@/api/http'

const accountSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer'),
  api_id: z.coerce.number().int().positive('API ID must be a positive integer'),
  api_hash: z.string().min(1, 'API Hash is required'),
  phone: z.string().min(1, 'Phone number is required'),
  name: z.string().optional(),
  username: z.string().optional(),
})

type AccountForm = z.infer<typeof accountSchema>

export function AccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<TelegramAccount | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts,
  })

  const createMutation = useMutation({
    mutationFn: accountsApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsModalOpen(false)
      success('Account created successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to create account')
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

  const deleteMutation = useMutation({
    mutationFn: accountsApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setDeleteConfirmId(null)
      success('Account deleted successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete account')
    },
  })

  const openCreateModal = () => {
    setEditingAccount(null)
    setIsModalOpen(true)
  }

  const openEditModal = (account: TelegramAccount) => {
    setEditingAccount(account)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAccount(null)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Telegram Accounts</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Manage your connected Telegram accounts
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {accounts?.length === 0 ? (
        <EmptyState
          icon={<Smartphone className="h-12 w-12" />}
          title="No accounts connected"
          description="Add your first Telegram account to start parsing messages"
          action={
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-[var(--color-accent)]" />
                  {account.name || `Account ${account.id}`}
                </CardTitle>
                {account.username && (
                  <CardDescription>@{account.username}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Phone className="h-4 w-4" />
                  {account.phone}
                </div>
                <div className="text-[var(--color-text-muted)]">
                  ID: {account.id}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => openEditModal(account)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirmId(account.id)}
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

      {/* Create/Edit Modal */}
      <AccountModal
        open={isModalOpen}
        onClose={closeModal}
        account={editingAccount}
        onSubmit={(data) => {
          if (editingAccount) {
            updateMutation.mutate({
              id: editingAccount.id,
              data: { name: data.name, username: data.username },
            })
          } else {
            createMutation.mutate(data)
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Account"
      >
        <p className="text-[var(--color-text-secondary)]">
          Are you sure you want to delete this account? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            loading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}

interface AccountModalProps {
  open: boolean
  onClose: () => void
  account: TelegramAccount | null
  onSubmit: (data: AccountForm) => void
  isLoading: boolean
}

function AccountModal({ open, onClose, account, onSubmit, isLoading }: AccountModalProps) {
  const isEditing = !!account

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          id: account.id,
          api_id: account.api_id,
          api_hash: account.api_hash,
          phone: account.phone,
          name: account.name || '',
          username: account.username || '',
        }
      : undefined,
  })

  // Reset form when account changes
  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit Account' : 'Add Telegram Account'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEditing && (
          <>
            <Input
              label="Telegram ID"
              type="number"
              placeholder="123456789"
              error={errors.id?.message}
              {...register('id')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="API ID"
                type="number"
                placeholder="12345678"
                error={errors.api_id?.message}
                {...register('api_id')}
              />
              <Input
                label="API Hash"
                placeholder="a1b2c3d4e5f6..."
                error={errors.api_hash?.message}
                {...register('api_hash')}
              />
            </div>
            <Input
              label="Phone Number"
              placeholder="+1234567890"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </>
        )}
        <Input
          label="Display Name (optional)"
          placeholder="My Account"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Username (optional)"
          placeholder="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Save Changes' : 'Add Account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

