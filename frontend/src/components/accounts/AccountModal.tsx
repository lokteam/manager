import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Phone } from 'lucide-react'
import { type TelegramAccount } from '@/api'
import { Button, Input, Modal } from '@/components/ui'
import { accountSchema, codeSchema, type AccountForm } from './schemas'

export interface AccountModalProps {
  open: boolean
  onClose: () => void
  step: 'details' | 'code'
  phone: string | null
  account: TelegramAccount | null
  onSubmit: (data: AccountForm) => void
  onConfirm: (code: string) => void
  isLoading: boolean
}

export function AccountModal({ open, onClose, step, phone, account, onSubmit, onConfirm, isLoading }: AccountModalProps) {
  const isEditing = !!account

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(step === 'details' ? accountSchema : codeSchema),
    defaultValues: account
      ? {
          api_id: account.api_id,
          api_hash: account.api_hash,
          phone: account.phone,
          name: account.name || '',
          username: account.username || '',
        }
      : {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          api_id: undefined as any,
          api_hash: '',
          phone: '',
          name: '',
          username: '',
          code: '',
        },
  })

  // Reset form when account or step changes
  useEffect(() => {
    if (open) {
      if (step === 'code') {
        reset({ code: '' })
      } else if (!isEditing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reset({ api_id: undefined as any, api_hash: '', phone: '', name: '', username: '' })
      }
    }
  }, [open, step, isEditing, reset])

  const handleClose = () => {
    reset()
    onClose()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFormSubmit = (data: any) => {
    if (step === 'details') {
      onSubmit(data)
    } else {
      onConfirm(data.code)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit Account' : step === 'details' ? 'Add Telegram Account' : 'Confirm Account'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {step === 'details' ? (
          <>
            {!isEditing && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="API ID"
                    type="number"
                    placeholder="12345678"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    error={(errors as any).api_id?.message}
                    {...register('api_id')}
                  />
                  <Input
                    label="API Hash"
                    placeholder="a1b2c3d4e5f6..."
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    error={(errors as any).api_hash?.message}
                    {...register('api_hash')}
                  />
                </div>
                <Input
                  label="Phone Number"
                  placeholder="+1234567890"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  error={(errors as any).phone?.message}
                  {...register('phone')}
                />
              </>
            )}
            {isEditing && (
              <>
                <Input
                  label="Display Name (optional)"
                  placeholder="My Account"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  error={(errors as any).name?.message}
                  {...register('name')}
                />
                <Input
                  label="Username (optional)"
                  placeholder="username"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  error={(errors as any).username?.message}
                  {...register('username')}
                />
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-[var(--color-bg-alt)] p-4 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2 font-medium text-[var(--color-text)]">
                <Phone className="h-4 w-4" />
                {phone}
              </div>
              <p className="mt-1">Enter the verification code sent to your Telegram account or via SMS.</p>
            </div>
            <Input
              label="Verification Code"
              placeholder="12345"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              error={(errors as any).code?.message}
              autoFocus
              {...register('code')}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Save Changes' : step === 'details' ? 'Next' : 'Connect Account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
