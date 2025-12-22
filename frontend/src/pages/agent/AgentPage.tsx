import { useState } from 'react'
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
import { telegramApi, agentsApi, dialogsApi, type Dialog, type TelegramFolder } from '@/api'
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
  Badge,
} from '@/components/ui'
import { HttpError } from '@/api/http'
import { cn } from '@/lib/utils'

type ScopeType = 'folder' | 'dialog'

interface AgentState {
  step: 'idle' | 'fetching' | 'reviewing' | 'complete' | 'error'
  message: string
}

export function AgentPage() {
  const [scopeType, setScopeType] = useState<ScopeType>('folder')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [selectedDialogKey, setSelectedDialogKey] = useState<string>('')
  const [maxMessages, setMaxMessages] = useState<number>(1000)
  const [agentState, setAgentState] = useState<AgentState>({ step: 'idle', message: '' })

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { success, error } = useToast()

  // Queries
  const { data: telegramFolders, isLoading: foldersLoading } = useQuery({
    queryKey: ['telegramFolders'],
    queryFn: telegramApi.getTelegramFolders,
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
    if (scopeType === 'folder') {
      if (!selectedFolderId) {
        error('Please select a folder')
        return
      }
      setAgentState({ step: 'fetching', message: 'Fetching messages from folder...' })
      fetchAllMutation.mutate({
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
        chat_id: dialogId,
        max_messages: maxMessages,
      })
    }
  }

  const isRunning = agentState.step === 'fetching' || agentState.step === 'reviewing'
  const isLoading = foldersLoading || dialogsLoading

  const dialogOptions = dialogs?.map((d) => ({
    value: `${d.account_id}:${d.id}`,
    label: d.name || `Dialog ${d.id}`,
  })) || []

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Agent Configuration</h1>
        <p className="mt-1 text-[var(--color-text-secondary)]">
          Configure and run the AI agent to filter job vacancies from your Telegram messages
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--color-accent)]" />
              Parse Configuration
            </CardTitle>
            <CardDescription>
              Select what messages to parse for job vacancies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scope Type Selection */}
            <div className="space-y-3">
              <label className="label">Parsing Scope</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setScopeType('folder')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border p-4 transition-all',
                    scopeType === 'folder'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
                  )}
                >
                  <FolderOpen className="h-5 w-5" />
                  <span className="font-medium">Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('dialog')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border p-4 transition-all',
                    scopeType === 'dialog'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
                  )}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">Dialog</span>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            {scopeType === 'folder' ? (
              <Select
                label="Select Telegram Folder"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                options={folderOptions}
                placeholder="Choose a folder..."
              />
            ) : (
              <Select
                label="Select Dialog"
                value={selectedDialogKey}
                onChange={(e) => setSelectedDialogKey(e.target.value)}
                options={dialogOptions}
                placeholder="Choose a dialog..."
              />
            )}

            {/* Max Messages */}
            <Input
              label="Max Messages to Parse"
              type="number"
              value={maxMessages}
              onChange={(e) => setMaxMessages(Number(e.target.value))}
              min={1}
              max={10000}
            />

            {/* Run Button */}
            <Button
              className="w-full"
              onClick={handleRun}
              disabled={isRunning}
              loading={isRunning}
            >
              {isRunning ? (
                'Processing...'
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Agent
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
            <CardDescription>
              Current processing status and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentStatusDisplay state={agentState} onGoToKanban={() => navigate('/kanban')} />
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-[var(--color-accent)]/30 bg-[var(--color-accent-muted)]">
        <CardContent className="flex items-start gap-4 py-4">
          <Bot className="mt-0.5 h-6 w-6 text-[var(--color-accent)]" />
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">How it works</h3>
            <ol className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]">
              <li>1. Select a folder or specific dialog to parse</li>
              <li>2. The agent fetches new messages from Telegram</li>
              <li>3. AI analyzes each message for job vacancy content</li>
              <li>4. Valid vacancies are added to your Kanban board with status "NEW"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
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

