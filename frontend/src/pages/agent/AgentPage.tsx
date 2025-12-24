import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Play,
  Download,
  FolderOpen,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { telegramApi, agentsApi, dialogsApi, accountsApi, type TelegramAccount } from '@/api'
import { useDeleteAccount } from '@/hooks/useAccounts'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Select,
  Input,
  Spinner,
  useToast,
} from '@/components/ui'
import { AccountModal } from '@/components/accounts/AccountModal'
import { AccountSwitcher } from '../telegram/components/AccountSwitcher'
import { HttpError } from '@/api/http'
import { cn } from '@/lib/utils'

type ScopeType = 'folder' | 'dialog'

interface AgentState {
  step: 'idle' | 'fetching' | 'reviewing' | 'complete' | 'error'
  message: string
}

export function AgentPage() {
  const [scopeType, setScopeType] = useState<ScopeType>('folder')
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [selectedDialogKey, setSelectedDialogKey] = useState<string>('')
  const [maxMessages, setMaxMessages] = useState<number>(1000)
  const [agentState, setAgentState] = useState<AgentState>({ step: 'idle', message: '' })
  
  // Account Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [pendingPhone, setPendingPhone] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<TelegramAccount | null>(null)

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { success, error } = useToast()
  
  const deleteAccountMutation = useDeleteAccount()

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

  // Queries
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts,
  })

  // Set default account if not selected
  useEffect(() => {
    if (accounts?.length && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  const { data: telegramFolders, isLoading: foldersLoading } = useQuery({
    queryKey: ['telegramFolders', selectedAccountId],
    queryFn: () => selectedAccountId ? telegramApi.getTelegramFolders(selectedAccountId) : Promise.resolve([]),
    enabled: !!selectedAccountId,
  })

  const { data: dialogs, isLoading: dialogsLoading } = useQuery({
    queryKey: ['dialogs'],
    queryFn: dialogsApi.getDialogs,
  })

  // Fetch mutations
  const fetchAllMutation = useMutation({
    mutationFn: telegramApi.fetchAll,
    onSuccess: () => {
      setAgentState({ step: 'reviewing', message: 'Running AI review agent...' })
      runReviewMutation.mutate({ max_messages: maxMessages })
    },
    onError: (err) => {
      setAgentState({
        step: 'error',
        message: err instanceof HttpError ? err.message : 'Failed to fetch messages',
      })
      error('Failed to fetch messages')
    },
  })

  const fetchMessagesMutation = useMutation({
    mutationFn: telegramApi.fetchMessages,
    onSuccess: () => {
      setAgentState({ step: 'reviewing', message: 'Running AI review agent...' })
      runReviewMutation.mutate({ max_messages: maxMessages })
    },
    onError: (err) => {
      setAgentState({
        step: 'error',
        message: err instanceof HttpError ? err.message : 'Failed to fetch messages',
      })
      error('Failed to fetch messages')
    },
  })

  // Review mutation
  const runReviewMutation = useMutation({
    mutationFn: agentsApi.runAgentReview,
    onSuccess: () => {
      setAgentState({ step: 'complete', message: 'Review complete! New vacancies added to Kanban.' })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      success('Agent review completed successfully!')
    },
    onError: (err) => {
      setAgentState({
        step: 'error',
        message: err instanceof HttpError ? err.message : 'Failed to run agent review',
      })
      error('Agent review failed')
    },
  })

  const handleRun = () => {
    if (!selectedAccountId) {
        error('Please select an account')
        return
    }

    if (scopeType === 'folder') {
      if (!selectedFolderId) {
        error('Please select a folder')
        return
      }
      setAgentState({ step: 'fetching', message: 'Fetching messages from folder...' })
      fetchAllMutation.mutate({
        account_id: selectedAccountId,
        folder_id: Number(selectedFolderId),
        max_messages: maxMessages,
      })
    } else {
      if (!selectedDialogKey) {
        error('Please select a dialog')
        return
      }
      const [, dialogId] = selectedDialogKey.split(':').map(Number)
      setAgentState({ step: 'fetching', message: 'Fetching messages from dialog...' })
      fetchMessagesMutation.mutate({
        account_id: selectedAccountId,
        chat_id: dialogId,
        max_messages: maxMessages,
      })
    }
  }

  const isRunning = agentState.step === 'fetching' || agentState.step === 'reviewing'
  const isLoading = foldersLoading || dialogsLoading

  const filteredDialogs = dialogs?.filter(d => d.account_id === selectedAccountId) || []
  const dialogOptions = filteredDialogs.map((d) => ({
    value: `${d.account_id}:${d.id}`,
    label: d.name || `Dialog ${d.id}`,
  }))

  const folderOptions = telegramFolders?.map((f) => ({
    value: f.id.toString(),
    label: f.title,
  })) || []

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 py-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Agent Configuration</h1>
        <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl">
          Configure and run the AI agent to filter job vacancies from your Telegram messages
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Configuration Card */}
        <Card className="shadow-lg border-[var(--color-border)]/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Bot className="h-6 w-6 text-[var(--color-accent)]" />
              Parse Configuration
            </CardTitle>
            <CardDescription className="text-sm">
              Select what messages to parse for job vacancies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-2">
            {/* Account Switcher */}
            <div className="space-y-3">
              <label className="label text-xs uppercase tracking-wider opacity-70">Telegram Account</label>
              <AccountSwitcher
                accounts={accounts || []}
                selectedAccountId={selectedAccountId}
                onSelectAccount={setSelectedAccountId}
                onAddAccount={handleAddAccount}
                onDeleteAccount={(id) => {
                  if (confirm('Delete account?')) {
                    deleteAccountMutation.mutate(id)
                  }
                }}
              />
            </div>

            {/* Scope Type Selection */}
            <div className="space-y-4">
              <label className="label text-xs uppercase tracking-wider opacity-70">Parsing Scope</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setScopeType('folder')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all duration-200',
                    scopeType === 'folder'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] scale-[1.02]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                  )}
                >
                  <FolderOpen className="h-6 w-6" />
                  <span className="font-bold">Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('dialog')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all duration-200',
                    scopeType === 'dialog'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] scale-[1.02]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                  )}
                >
                  <MessageSquare className="h-6 w-6" />
                  <span className="font-bold">Dialog</span>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
            {scopeType === 'folder' ? (
              <Select
                label="Select Telegram Folder"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                options={folderOptions}
                placeholder="Choose a folder..."
                disabled={!selectedAccountId}
              />
            ) : (
              <Select
                label="Select Dialog"
                value={selectedDialogKey}
                onChange={(e) => setSelectedDialogKey(e.target.value)}
                options={dialogOptions}
                placeholder="Choose a dialog..."
                disabled={!selectedAccountId}
              />
            )}
            </div>

            {/* Max Messages */}
            <Input
              label="Max Messages to Parse"
              type="number"
              value={maxMessages}
              onChange={(e) => setMaxMessages(Number(e.target.value))}
              min={1}
              max={10000}
              className="bg-[var(--color-bg-tertiary)]/50"
            />

            {/* Run Button */}
            <Button
              className="w-full h-12 text-base font-bold shadow-md"
              onClick={handleRun}
              disabled={isRunning || !selectedAccountId}
              loading={isRunning}
            >
              {isRunning ? (
                'Processing...'
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" />
                  Run Agent
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="shadow-lg border-[var(--color-border)]/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Agent Status</CardTitle>
            <CardDescription className="text-sm">
              Current processing status and results
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <AgentStatusDisplay state={agentState} onGoToKanban={() => navigate('/kanban')} />
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-[var(--color-accent)]/30 bg-[var(--color-accent-muted)] rounded-2xl">
        <CardContent className="flex items-start gap-6 py-6">
          <div className="p-3 rounded-full bg-[var(--color-accent)]/10">
            <Bot className="h-8 w-8 text-[var(--color-accent)]" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-[var(--color-text-primary)] text-lg">How it works</h3>
            <ol className="grid gap-2 text-sm text-[var(--color-text-secondary)]">
              <li className="flex gap-2"><span>1.</span> Select a Telegram account and a folder or specific dialog</li>
              <li className="flex gap-2"><span>2.</span> The agent fetches new messages from Telegram</li>
              <li className="flex gap-2"><span>3.</span> AI analyzes each message for job vacancy content</li>
              <li className="flex gap-2"><span>4.</span> Valid vacancies are added to your Kanban board with status "NEW"</li>
            </ol>
          </div>
        </CardContent>
      </Card>

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

interface AgentStatusDisplayProps {
  state: AgentState
  onGoToKanban: () => void
}

function AgentStatusDisplay({ state, onGoToKanban }: AgentStatusDisplayProps) {
  const steps = [
    { key: 'fetching', label: 'Fetching messages', icon: Download },
    { key: 'reviewing', label: 'AI review', icon: Bot },
    { key: 'complete', label: 'Complete', icon: CheckCircle2 },
  ]

  if (state.step === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bot className="mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
        <p className="text-[var(--color-text-secondary)]">
          Configure your scope and click "Run Agent" to start processing
        </p>
      </div>
    )
  }

  if (state.step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-[var(--color-error)]" />
        <p className="font-medium text-[var(--color-error)]">Error</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{state.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      {/* Progress Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const stepIndex = steps.findIndex((s) => s.key === state.step)
          const isActive = step.key === state.step
          const isComplete = index < stepIndex || state.step === 'complete'
          const isPending = index > stepIndex
 
          return (
            <div key={step.key} className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  isComplete && 'bg-[var(--color-success)]/20 text-[var(--color-success)]',
                  isActive && 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]',
                  isPending && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                )}
              >
                {isActive && state.step !== 'complete' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div>
                <p
                  className={cn(
                    'font-medium',
                    isComplete && 'text-[var(--color-success)]',
                    isActive && 'text-[var(--color-accent)]',
                    isPending && 'text-[var(--color-text-muted)]'
                  )}
                >
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-sm text-[var(--color-text-secondary)]">{state.message}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Complete State Actions */}
      {state.step === 'complete' && (
        <div className="pt-4">
          <Button onClick={onGoToKanban} className="w-full">
            <CheckCircle2 className="h-4 w-4" />
            View Kanban Board
          </Button>
        </div>
      )}
    </div>
  )
}
