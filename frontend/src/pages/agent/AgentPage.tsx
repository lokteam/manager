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
  HelpCircle,
  ChevronDown,
  Search,
  Settings2,
  X,
  Clock,
} from 'lucide-react'
import { telegramApi, agentsApi, dialogsApi, accountsApi, type TelegramAccount } from '@/api'
import { useDeleteAccount, usePrompts } from '@/hooks'
import {
  Button,
  Input,
  Spinner,
  useToast,
  Badge,
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

const MESSAGE_CAPACITY_STEPS = [
  ...Array.from({ length: 20 }, (_, i) => i + 1),
  ...Array.from({ length: 16 }, (_, i) => 25 + i * 5),
  ...Array.from({ length: 14 }, (_, i) => 110 + i * 10),
  ...Array.from({ length: 13 }, (_, i) => 260 + i * 20),
  ...Array.from({ length: 10 }, (_, i) => 550 + i * 50),
  ...Array.from({ length: 20 }, (_, i) => 1200 + i * 200),
]

export function AgentPage() {
  const [scopeType, setScopeType] = useState<ScopeType>('folder')
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [selectedDialogKey, setSelectedDialogKey] = useState<string>('')
  const [selectedPromptId, setSelectedPromptId] = useState<string>('')
  const [maxMessages, setMaxMessages] = useState<number>(100)
  const [newOnly, setNewOnly] = useState<boolean>(true)
  const [agentState, setAgentState] = useState<AgentState>({ step: 'idle', message: '' })
  
  const [dateMode, setDateMode] = useState<'relative' | 'range'>('relative')
  const [relativeDate, setRelativeDate] = useState('1d')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [promptSearch, setPromptSearch] = useState('')
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  // Account Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [pendingPhone, setPendingPhone] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<TelegramAccount | null>(null)

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { success, error } = useToast()
  
  const deleteAccountMutation = useDeleteAccount()

  // Queries
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts,
  })

  const { data: prompts } = usePrompts()

  useEffect(() => {
    if (accounts?.length && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  useEffect(() => {
    if (prompts?.length && !selectedPromptId) {
      setSelectedPromptId(prompts[0].id.toString())
    }
  }, [prompts, selectedPromptId])

  const { data: telegramFolders, isLoading: foldersLoading } = useQuery({
    queryKey: ['telegramFolders', selectedAccountId],
    queryFn: () => selectedAccountId ? telegramApi.getTelegramFolders(selectedAccountId) : Promise.resolve([]),
    enabled: !!selectedAccountId,
  })

  const { data: dialogs, isLoading: dialogsLoading } = useQuery({
    queryKey: ['dialogs'],
    queryFn: dialogsApi.getDialogs,
  })

  // Mutations
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

  // Fetch mutations
  const fetchAllMutation = useMutation({
    mutationFn: telegramApi.fetchAll,
    onSuccess: () => {
      setAgentState({ step: 'reviewing', message: 'Running AI review agent...' })
      runReviewMutation.mutate({ 
        prompt_id: Number(selectedPromptId),
        max_messages: maxMessages,
        new_only: newOnly,
        account_id: selectedAccountId || undefined,
        folder_id: Number(selectedFolderId) || undefined
      })
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
      const [, dialogId] = selectedDialogKey.split(':').map(Number)
      runReviewMutation.mutate({ 
        prompt_id: Number(selectedPromptId),
        max_messages: maxMessages,
        new_only: newOnly,
        account_id: selectedAccountId || undefined,
        chat_id: dialogId
      })
    },
    onError: (err) => {
      setAgentState({
        step: 'error',
        message: err instanceof HttpError ? err.message : 'Failed to fetch messages',
      })
      error('Failed to fetch messages')
    },
  })

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
    if (!selectedPromptId) {
        error('Please select a prompt')
        return
    }

    let date_from: string | undefined = undefined
    let date_to: string | undefined = undefined

    if (dateMode === 'relative') {
      const now = new Date()
      if (relativeDate === '1h') now.setHours(now.getHours() - 1)
      else if (relativeDate === '6h') now.setHours(now.getHours() - 6)
      else if (relativeDate === '12h') now.setHours(now.getHours() - 12)
      else if (relativeDate === '1d') now.setDate(now.getDate() - 1)
      else if (relativeDate === '1w') now.setDate(now.getDate() - 7)
      else if (relativeDate === '1m') now.setMonth(now.getMonth() - 1)
      date_from = now.toISOString()
    } else {
      if (dateFrom) date_from = new Date(dateFrom).toISOString()
      if (dateTo) date_to = new Date(dateTo).toISOString()
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
        new_only: newOnly,
        date_from,
        date_to,
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
        new_only: newOnly,
        date_from,
        date_to,
      })
    }
  }

  const isRunning = agentState.step !== 'idle' && agentState.step !== 'complete' && agentState.step !== 'error'
  const isFinished = agentState.step === 'complete' || agentState.step === 'error'

  const filteredDialogs = dialogs?.filter(d => d.account_id === selectedAccountId) || []
  const dialogOptions = filteredDialogs.map((d) => ({
    value: `${d.account_id}:${d.id}`,
    label: d.name || `Dialog ${d.id}`,
    searchTerms: [d.name, d.username, d.id.toString()].filter(Boolean).join(' ').toLowerCase()
  }))

  const folderOptions = telegramFolders?.map((f) => ({
    value: f.id.toString(),
    label: f.title,
    searchTerms: f.title.toLowerCase()
  })) || []

  const filteredPrompts = prompts?.filter(p => 
    p.name.toLowerCase().includes(promptSearch.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(promptSearch.toLowerCase()))
  ) || []

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAccount(null)
    setStep('details')
    setPendingPhone(null)
  }

  if (foldersLoading || dialogsLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[var(--color-bg-primary)] overflow-hidden">
      {/* Top Header Centered Switcher */}
      <div className="mx-auto max-w-3xl w-full pt-8 pb-4 flex flex-col items-center shrink-0 relative">
        <div className="space-y-2 max-w-md w-full text-center">
          <label className="label text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] opacity-80">Active Telegram Account</label>
          <AccountSwitcher
            accounts={accounts || []}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            onAddAccount={() => { setEditingAccount(null); setStep('details'); setIsModalOpen(true); }}
            onDeleteAccount={(id) => { if (confirm('Delete account?')) deleteAccountMutation.mutate(id) }}
          />
        </div>

        {/* Help Button - Moved to header */}
        <div className="absolute top-8 right-0 lg:-right-24 z-40">
           <button 
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className={cn("p-2.5 rounded-full transition-all shadow-lg", showHowItWorks ? "bg-[var(--color-accent)] text-white scale-110" : "bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]")}
            title="How it works"
          >
            {showHowItWorks ? <X className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {showHowItWorks && (
          <div className="absolute inset-0 z-50 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm p-12 flex items-center justify-center animate-in fade-in duration-300">
            <div className="bg-[var(--color-bg-secondary)] max-w-xl w-full p-10 rounded-[2rem] shadow-2xl border-2 border-[var(--color-accent)]/20 relative">
              <button onClick={() => setShowHowItWorks(false)} className="absolute top-6 right-6 p-2 hover:bg-[var(--color-bg-tertiary)] rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
                   <Bot className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black">How it works</h3>
              </div>
              <ol className="space-y-6 text-[var(--color-text-secondary)]">
                <li className="flex gap-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white font-black">1</span>
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--color-text-primary)]">Select Source</p>
                    <p className="text-sm">Choose a Telegram account and a specific folder or dialog to scan for messages.</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white font-black">2</span>
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--color-text-primary)]">Configure Filter</p>
                    <p className="text-sm">Set the time range and maximum messages per chat to define the parsing scope.</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white font-black">3</span>
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--color-text-primary)]">AI Analysis</p>
                    <p className="text-sm">Select a custom prompt from your database. The AI will analyze each message against your criteria.</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white font-black">4</span>
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--color-text-primary)]">Results</p>
                    <p className="text-sm">Extracted vacancies are automatically added to your Kanban board with all relevant details.</p>
                  </div>
                </li>
              </ol>
              <Button onClick={() => setShowHowItWorks(false)} className="w-full mt-10 py-6 rounded-2xl text-lg font-bold">Got it!</Button>
            </div>
          </div>
        )}

        {isRunning || isFinished ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-[var(--color-bg-primary)] overflow-hidden">
            <AgentStatusDisplay state={agentState} onReset={() => setAgentState({ step: 'idle', message: '' })} onGoToKanban={() => navigate('/kanban')} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden p-8 lg:p-12 pt-0 lg:pt-0">
            <div className="max-w-6xl mx-auto h-full flex flex-col">
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden min-h-0">
                
                {/* Left Column: Source & Window */}
                <div className="lg:col-span-5 flex flex-col space-y-8 overflow-y-auto pb-8">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Source Configuration</h2>
                    </div>
                    
                    <div className="flex p-1 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]">
                      <button 
                        onClick={() => setScopeType('folder')}
                        className={cn("flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest", scopeType === 'folder' ? "bg-[var(--color-bg-primary)] shadow-sm text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]")}
                      >
                        <FolderOpen className="h-4 w-4" /> Folder
                      </button>
                      <button 
                        onClick={() => setScopeType('dialog')}
                        className={cn("flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest", scopeType === 'dialog' ? "bg-[var(--color-bg-primary)] shadow-sm text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]")}
                      >
                        <MessageSquare className="h-4 w-4" /> Dialog
                      </button>
                    </div>

                    <SearchableSelect 
                      label={scopeType === 'folder' ? "Select Target Folder" : "Select Target Dialog"}
                      value={scopeType === 'folder' ? selectedFolderId : selectedDialogKey}
                      placeholder={scopeType === 'folder' ? "Search folders..." : "Search by name, id or @username..."}
                      searchPlaceholder={scopeType === 'folder' ? "Type to filter folders..." : "Type to filter by name, id or handle..."}
                      options={scopeType === 'folder' ? folderOptions : dialogOptions}
                      onChange={scopeType === 'folder' ? setSelectedFolderId : setSelectedDialogKey}
                      disabled={!selectedAccountId}
                    />
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Time Window</h2>
                    </div>

                    <div className="bg-[var(--color-bg-secondary)] p-6 rounded-3xl border border-[var(--color-border)] space-y-6">
                      <div className="flex justify-center">
                        <div className="flex bg-[var(--color-bg-primary)] p-1 rounded-xl border border-[var(--color-border)] w-full">
                          <button 
                            onClick={() => setDateMode('relative')}
                            className={cn("flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all", dateMode === 'relative' ? "bg-[var(--color-accent)] text-white shadow-md" : "text-[var(--color-text-muted)]")}
                          >
                            Recent History
                          </button>
                          <button 
                            onClick={() => setDateMode('range')}
                            className={cn("flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all", dateMode === 'range' ? "bg-[var(--color-accent)] text-white shadow-md" : "text-[var(--color-text-muted)]")}
                          >
                            Specific Range
                          </button>
                        </div>
                      </div>

                      {dateMode === 'relative' ? (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: '1 Hour', value: '1h' },
                            { label: '6 Hours', value: '6h' },
                            { label: '12 Hours', value: '12h' },
                            { label: '24 Hours', value: '1d' },
                            { label: '7 Days', value: '1w' },
                            { label: '30 Days', value: '1m' },
                          ].map(opt => (
                            <button 
                              key={opt.value}
                              onClick={() => setRelativeDate(opt.value)}
                              className={cn("py-3 px-2 rounded-2xl border-2 text-[10px] font-black uppercase transition-all", relativeDate === opt.value ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]/30 text-[var(--color-accent)]" : "border-transparent bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]")}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] px-1 flex items-center gap-2">
                              <Clock className="h-3 w-3" /> Start Date
                            </label>
                            <Input type="datetime-local" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[var(--color-bg-primary)] border-[var(--color-border)] h-12 rounded-2xl text-sm" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] px-1 flex items-center gap-2">
                              <Clock className="h-3 w-3" /> End Date
                            </label>
                            <Input type="datetime-local" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[var(--color-bg-primary)] border-[var(--color-border)] h-12 rounded-2xl text-sm" />
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--color-border)]">
                        <label className="flex items-center justify-between cursor-pointer group">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black uppercase text-[var(--color-text-primary)]">New Messages Only</span>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter">Only fetch unread messages from Telegram</p>
                          </div>
                          <div 
                            onClick={() => setNewOnly(!newOnly)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              newOnly ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-tertiary)]"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                newOnly ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </div>
                        </label>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column: Prompts & Limits */}
                <div className="lg:col-span-7 flex flex-col space-y-8 overflow-hidden min-h-0 pb-8">
                  <section className="flex flex-col flex-1 min-h-0 space-y-6">
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Analysis Strategy</h2>
                    </div>

                    <div className="flex flex-col flex-1 min-h-0 bg-[var(--color-bg-secondary)] rounded-[2.5rem] border border-[var(--color-border)] overflow-hidden shadow-sm">
                      {/* Sticky Search bar at top of Strategy block */}
                      <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                          <input 
                            value={promptSearch}
                            onChange={e => setPromptSearch(e.target.value)}
                            placeholder="Search strategy by name or description..."
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-muted)] transition-all"
                          />
                        </div>
                      </div>

                      {/* Scrollable Prompts List - Flex col prevents items from expanding to fill height */}
                      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                        {filteredPrompts.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => setSelectedPromptId(p.id.toString())}
                            className={cn(
                              "w-full text-left p-6 rounded-2xl border-2 transition-all group flex items-start gap-4 shrink-0 h-auto", 
                              selectedPromptId === p.id.toString() 
                                ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]/10" 
                                : "border-transparent bg-[var(--color-bg-primary)] hover:border-[var(--color-text-muted)]"
                            )}
                          >
                            <div className={cn("p-3 rounded-xl shrink-0 transition-colors", selectedPromptId === p.id.toString() ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]")}>
                               <Settings2 className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1 gap-2">
                                <span className={cn("font-black text-base truncate", selectedPromptId === p.id.toString() ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]")}>{p.name}</span>
                                {selectedPromptId === p.id.toString() && <Badge variant="secondary" className="bg-[var(--color-accent)] text-white border-0 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shrink-0">Active</Badge>}
                              </div>
                              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 opacity-80 leading-relaxed">{p.description || 'No description provided for this analysis strategy.'}</p>
                            </div>
                          </button>
                        ))}
                        
                        {(!prompts || prompts.length === 0) && (
                          <div className="flex-1 flex flex-col items-center justify-center py-12">
                            <p className="text-[var(--color-text-muted)] font-bold mb-4">No analysis prompts found</p>
                            <Button onClick={() => navigate('/prompts')} variant="secondary" size="sm">Create Prompt First</Button>
                          </div>
                        )}

                        {prompts && prompts.length > 0 && filteredPrompts.length === 0 && (
                          <div className="flex-1 flex flex-col items-center justify-center py-12">
                            <p className="text-[var(--color-text-muted)] font-bold">No strategies match your search</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6 shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Parser limits</h2>
                    </div>

                    <div className="bg-[var(--color-bg-secondary)] p-8 rounded-[2rem] border border-[var(--color-border)] space-y-6 shadow-sm">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-sm font-black uppercase text-[var(--color-text-primary)]">Message Capacity</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter">Messages per individual chat</p>
                        </div>
                        <div className="text-3xl font-black text-[var(--color-accent)] tabular-nums">
                          {maxMessages}
                        </div>
                      </div>
                      
                      <div className="relative flex items-center py-2">
                        <input 
                          type="range"
                          min="0"
                          max={MESSAGE_CAPACITY_STEPS.length - 1}
                          step="1"
                          value={MESSAGE_CAPACITY_STEPS.indexOf(maxMessages)}
                          onChange={e => setMaxMessages(MESSAGE_CAPACITY_STEPS[Number(e.target.value)])}
                          className="w-full h-2 bg-[var(--color-bg-primary)] rounded-full appearance-none cursor-pointer accent-[var(--color-accent)] border border-[var(--color-border)]"
                        />
                      </div>
                      
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                        <span>Light Scan (1)</span>
                        <span>Deep Analysis (5000)</span>
                      </div>
                    </div>
                  </section>

                  <div className="pt-2 shrink-0">
                    <Button 
                      className="w-full py-7 rounded-[2rem] text-xl font-black shadow-2xl hover:scale-[1.01] transition-all duration-300 shadow-[var(--color-accent)]/20"
                      onClick={handleRun}
                      disabled={!selectedAccountId || !selectedPromptId}
                    >
                      <Play className="h-6 w-6 fill-current mr-3" />
                      Launch Analysis Agent
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </div>
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

interface Option {
  value: string
  label: string
  searchTerms?: string
}

interface SearchableSelectProps {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  disabled: boolean
}

function SearchableSelect({ label, value, options, onChange, placeholder, disabled, searchPlaceholder }: SearchableSelectProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const filteredOptions = options.filter((o: Option) => {
    const term = search.toLowerCase()
    if (o.searchTerms) {
      return o.searchTerms.includes(term)
    }
    return o.label.toLowerCase().includes(term) || o.value.includes(term)
  })
  
  const selectedOption = options.find((o: Option) => o.value === value)
  
  return (
    <div className="relative space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-1">{label}</label>
      <div 
        className={cn("h-14 flex items-center justify-between cursor-pointer rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-5 transition-all hover:border-[var(--color-text-muted)]", isOpen && "border-[var(--color-accent)] ring-2 ring-[var(--color-accent-muted)]", disabled && "opacity-50 cursor-not-allowed")}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 truncate mr-2">
           <Search className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
           <span className={cn("text-sm font-medium truncate", !selectedOption && "text-[var(--color-text-muted)]")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-300 shrink-0", isOpen && "rotate-180")} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-72 animate-in slide-in-from-top-2 duration-300">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
              <input 
                autoFocus
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                className="w-full bg-transparent pl-9 pr-3 py-2 text-sm focus:outline-none font-medium"
                placeholder={searchPlaceholder || "Type to filter..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto p-2 no-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map((opt: Option) => (
              <div 
                key={opt.value}
                className={cn("px-4 py-3 text-sm cursor-pointer rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-colors flex items-center justify-between group", value === opt.value && "bg-[var(--color-accent-muted)]/30 text-[var(--color-accent)] font-bold")}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(opt.value)
                  setIsOpen(false)
                  setSearch('')
                }}
              >
                <span className="truncate mr-4">{opt.label}</span>
                {value === opt.value && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              </div>
            )) : (
              <div className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)] flex flex-col items-center gap-2">
                <Search className="h-8 w-8 opacity-10" />
                <span>No matching results found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface AgentStatusDisplayProps {
  state: AgentState
  onReset: () => void
  onGoToKanban: () => void
}

function AgentStatusDisplay({ state, onReset, onGoToKanban }: AgentStatusDisplayProps) {
  const steps = [
    { key: 'fetching', label: 'Message Sync', icon: Download },
    { key: 'reviewing', label: 'AI Processing', icon: Bot },
    { key: 'complete', label: 'Analysis Finished', icon: CheckCircle2 },
  ]

  if (state.step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in max-w-md h-full">
        <div className="h-24 w-24 rounded-[2rem] bg-red-500/10 flex items-center justify-center mb-8 border-2 border-red-500/20 shrink-0">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-3">Agent Interrupted</h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-10 opacity-80 leading-relaxed">{state.message}</p>
        <div className="flex gap-4 w-full shrink-0">
           <Button onClick={onReset} variant="secondary" className="flex-1 py-6 rounded-2xl font-bold">Adjust Settings</Button>
           <Button onClick={onReset} className="flex-1 py-6 rounded-2xl font-bold bg-red-500 hover:bg-red-600 border-0">Restart Agent</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg space-y-16 py-12 h-full flex flex-col justify-center">
      <div className="flex justify-between relative px-4 shrink-0">
        {/* Connection Line */}
        <div className="absolute top-7 left-12 right-12 h-1 bg-[var(--color-border)] -z-0 rounded-full" />
        <div className={cn("absolute top-7 left-12 h-1 bg-[var(--color-accent)] transition-all duration-1000 rounded-full", 
          state.step === 'fetching' ? 'w-0' : state.step === 'reviewing' ? 'w-[42%]' : 'w-[84%]'
        )} />

        {steps.map((step, index) => {
          const stepIndex = steps.findIndex(s => s.key === state.step)
          const isActive = step.key === state.step
          const isComplete = index < stepIndex || state.step === 'complete'
          
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-5">
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-xl", 
                isComplete ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-[var(--color-accent)]/30" : 
                isActive ? "bg-[var(--color-bg-secondary)] border-[var(--color-accent)] text-[var(--color-accent)] scale-125 ring-8 ring-[var(--color-accent-muted)]/20" : 
                "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}>
                {isActive && state.step !== 'complete' ? <Loader2 className="h-6 w-6 animate-spin" /> : <step.icon className="h-6 w-6" />}
              </div>
              <div className="text-center">
                <p className={cn("text-[10px] font-black uppercase tracking-[0.1em] mb-1", 
                  isActive || isComplete ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                )}>{step.label}</p>
                {isActive && <Badge variant="secondary" className="bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[8px] border-0 px-2 uppercase">In Progress</Badge>}
                {isComplete && <Badge variant="secondary" className="bg-[var(--color-success)]/10 text-[var(--color-success)] text-[8px] border-0 px-2 uppercase">Done</Badge>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center space-y-6 pt-8 shrink-0">
        <div className="space-y-2">
           <h4 className="font-black text-3xl tracking-tight text-[var(--color-text-primary)]">{state.message}</h4>
           <p className="text-sm text-[var(--color-text-secondary)] opacity-60">This may take a few moments depending on the message volume.</p>
        </div>
        
        {state.step === 'complete' && (
           <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <Button onClick={onGoToKanban} className="w-full py-8 rounded-[2rem] text-lg font-black shadow-2xl shadow-[var(--color-accent)]/30">
               Review Extracted Vacancies
             </Button>
             <button onClick={onReset} className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all flex items-center justify-center gap-2 mx-auto py-2">
               <Settings2 className="h-4 w-4" /> Run New Analysis
             </button>
           </div>
        )}
      </div>
    </div>
  )
}
