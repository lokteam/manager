import { Plus, ChevronDown, User, Trash2 } from 'lucide-react'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import type { TelegramAccount } from '@/api/types'
import { cn } from '@/lib/utils'

interface AccountSwitcherProps {
  accounts: TelegramAccount[]
  selectedAccountId: number | null
  onSelectAccount: (id: number) => void
  onAddAccount: () => void
  onDeleteAccount: (id: number) => void
}

export const AccountSwitcher = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onDeleteAccount,
}: AccountSwitcherProps) => {
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  const getInitials = (account: TelegramAccount) => {
    if (account.name && account.name.trim()) {
      return account.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return account.phone?.slice(-2) || '?'
  }

  const getDisplayName = (account: TelegramAccount) => {
    return account.name || account.phone || account.username || 'Unknown Account'
  }

  if (!accounts || accounts.length === 0) {
    return (
      <button
        onClick={onAddAccount}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] p-6 text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)]"
      >
        <Plus className="h-6 w-6" />
        <span className="font-bold text-lg">Add First Account</span>
      </button>
    )
  }

  return (
    <Dropdown
      width="w-80"
      trigger={
        <div className="flex w-full items-center justify-between rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-md transition-all duration-200 hover:border-[var(--color-accent)]/70 hover:bg-[var(--color-bg-tertiary)] group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-lg font-black text-black shadow-lg transition-transform group-hover:scale-105">
              {selectedAccount ? getInitials(selectedAccount) : <User className="h-6 w-6" />}
            </div>
            <div className="flex flex-col items-start overflow-hidden">
              <span className="truncate text-base font-extrabold text-[var(--color-text-primary)]">
                {selectedAccount ? getDisplayName(selectedAccount) : 'Select Account'}
              </span>
              <div className="flex items-center gap-2">
                {selectedAccount?.phone && (
                  <span className="truncate text-xs text-[var(--color-text-muted)] font-bold">
                    {selectedAccount.phone}
                  </span>
                )}
                {selectedAccount?.username && (
                  <span className="truncate text-xs text-[var(--color-accent)] font-medium opacity-80">
                    @{selectedAccount.username}
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text-secondary)]" />
        </div>
      }
    >
      <div className="max-h-80 overflow-y-auto py-2 px-1">
        {accounts.map((account) => (
          <div key={account.id} className="relative group/item">
            <DropdownItem
              onClick={() => onSelectAccount(account.id)}
              className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-xl transition-all',
                selectedAccountId === account.id 
                  ? 'bg-[var(--color-bg-tertiary)] border border-[var(--color-accent)]/20' 
                  : 'hover:bg-[var(--color-bg-tertiary)]/50'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)]">
                {getInitials(account)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <span className="truncate font-bold text-sm">{getDisplayName(account)}</span>
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="truncate text-[10px] text-[var(--color-text-muted)] font-medium">
                    {account.phone}
                  </span>
                  {account.username && (
                    <span className="truncate text-[10px] text-[var(--color-accent)] opacity-70">
                      @{account.username}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Are you sure you want to delete this account?')) {
                    onDeleteAccount(account.id)
                  }
                }}
                className="opacity-0 group-hover/item:opacity-100 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </DropdownItem>
          </div>
        ))}
      </div>
      <div className="mx-2 my-2 h-px bg-[var(--color-border)] opacity-50" />
      <DropdownItem onClick={onAddAccount} className="mx-1 rounded-xl text-[var(--color-accent)] font-bold hover:bg-[var(--color-accent-muted)]">
        <div className="flex items-center gap-3 py-1">
          <div className="p-1 rounded-lg bg-[var(--color-accent)]/10">
            <Plus className="h-5 w-5" />
          </div>
          <span>Add New Account</span>
        </div>
      </DropdownItem>
    </Dropdown>
  )
}
