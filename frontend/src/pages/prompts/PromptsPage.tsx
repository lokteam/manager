import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, BookOpen, ChevronLeft, ChevronRight, History, Trash } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { 
  usePrompts, 
  useTrashPrompts,
  usePromptHistory,
  useCreatePrompt, 
  useUpdatePrompt, 
  useDeletePrompt,
  useRestorePrompt
} from '@/hooks'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Textarea, Modal, Spinner } from '@/components/ui'
import { type Prompt } from '@/api/prompts'
import { cn } from '@/lib/utils'

export function PromptsPage() {
  const [showTrash, setShowTrash] = useState(false)
  const { data: activePrompts = [], isLoading: isActiveLoading } = usePrompts()
  const { data: trashPrompts = [], isLoading: isTrashLoading } = useTrashPrompts()
  const prompts = showTrash ? trashPrompts : activePrompts
  const isLoading = isActiveLoading || isTrashLoading

  const createPrompt = useCreatePrompt()
  const updatePrompt = useUpdatePrompt()
  const deletePrompt = useDeletePrompt()
  const restorePrompt = useRestorePrompt()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewingPromptId, setViewingPromptId] = useState<number | null>(null)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', content: '' })

  const { data: history = [] } = usePromptHistory(viewingPromptId)

  const viewingPrompt = useMemo(() => {
    if (!viewingPromptId) return null
    if (viewingVersion) {
      return history.find(p => p.version === viewingVersion) || history[0]
    }
    return history[0]
  }, [history, viewingPromptId, viewingVersion])

  const handleOpenModal = (prompt?: Prompt) => {
    if (prompt) {
      setEditingId(prompt.id)
      setFormData({ name: prompt.name, description: prompt.description || '', content: prompt.content })
    } else {
      setEditingId(null)
      setFormData({ name: '', description: '', content: '' })
    }
    setIsModalOpen(true)
  }

  const handleViewPrompt = (prompt: Prompt) => {
    setViewingPromptId(prompt.id)
    setViewingVersion(prompt.version)
  }

  const navigateVersion = (direction: 'next' | 'prev') => {
    if (!history.length || !viewingPrompt) return
    const currentIndex = history.findIndex(p => p.version === viewingPrompt.version)
    if (direction === 'prev' && currentIndex < history.length - 1) {
      setViewingVersion(history[currentIndex + 1].version)
    } else if (direction === 'next' && currentIndex > 0) {
      setViewingVersion(history[currentIndex - 1].version)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updatePrompt.mutate({ id: editingId, data: formData }, {
        onSuccess: () => setIsModalOpen(false)
      })
    } else {
      createPrompt.mutate(formData, {
        onSuccess: () => setIsModalOpen(false)
      })
    }
  }

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-8 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Agent Prompts ({prompts.length})</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage AI prompts for message analysis</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={() => setShowTrash(!showTrash)}
            className={cn("rounded-xl", showTrash && "bg-[var(--color-bg-tertiary)] border-[var(--color-accent)]")}
          >
            {showTrash ? <BookOpen className="h-5 w-5" /> : <Trash className="h-5 w-5" />}
            {showTrash ? 'Active' : 'Trash'}
          </Button>
          {!showTrash && (
            <Button onClick={() => handleOpenModal()} className="rounded-xl shadow-lg">
              <Plus className="h-5 w-5" />
              Add Prompt
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map((prompt) => (
          <Card 
            key={prompt.id} 
            className="group hover:border-[var(--color-accent)]/50 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
            onClick={() => handleViewPrompt(prompt)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold truncate pr-2">{prompt.name}</CardTitle>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!showTrash ? (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenModal(prompt)
                        }} 
                        className="p-1.5 hover:bg-[var(--color-bg-tertiary)] rounded-md text-[var(--color-text-secondary)]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this prompt?')) deletePrompt.mutate(prompt.id)
                        }}
                        className="p-1.5 hover:bg-red-500/10 rounded-md text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        restorePrompt.mutate(prompt.id)
                      }}
                      className="p-1.5 hover:bg-[var(--color-accent-muted)] rounded-md text-[var(--color-accent)]"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
              <CardDescription className="line-clamp-2 min-h-[2.5rem]">{prompt.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-xs font-mono line-clamp-4 opacity-70">
                {prompt.content}
              </div>
            </CardContent>
          </Card>
        ))}

        {prompts.length === 0 && (
          <div className="col-span-full py-16 text-center bg-[var(--color-bg-secondary)] rounded-3xl border-2 border-dashed border-[var(--color-border)]">
            <BookOpen className="h-12 w-12 mx-auto text-[var(--color-text-muted)] opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No prompts yet</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">Create your first prompt to start using AI agents</p>
            <Button onClick={() => handleOpenModal()} variant="secondary">Add Prompt</Button>
          </div>
        )}
      </div>

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Prompt' : 'Add Prompt'}
        className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] flex flex-col"
      >
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            <Input 
              label="Name" 
              required 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Vacancy Filter v1"
            />
            <Input 
              label="Description (Optional)" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="What this prompt is for..."
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <Textarea 
              label="Prompt Content" 
              required 
              value={formData.content} 
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder="Paste your system prompt here..."
              className="flex-1 font-mono text-sm leading-relaxed resize-none h-full"
              containerClassName="flex-1 flex flex-col"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 shrink-0 border-t border-[var(--color-border)] mt-auto">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createPrompt.isPending || updatePrompt.isPending}>
              {editingId ? 'Save Changes' : 'Create Prompt'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewingPromptId}
        onClose={() => setViewingPromptId(null)}
        title={viewingPrompt?.name || ''}
        className="max-w-4xl w-[90vw] max-h-[85vh] flex flex-col"
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
            <div className="text-sm text-[var(--color-text-secondary)]">
              {viewingPrompt?.description || 'No description'}
            </div>
            <div className="flex items-center gap-4 bg-[var(--color-bg-tertiary)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
              <span className="text-xs font-mono font-medium text-[var(--color-text-muted)]">
                Version {viewingPrompt?.version} / {history[0]?.version}
              </span>
              <div className="flex gap-1 border-l border-[var(--color-border)] pl-3">
                <button 
                  onClick={() => navigateVersion('prev')}
                  disabled={!viewingPrompt || history.findIndex(p => p.version === viewingPrompt.version) === history.length - 1}
                  className="p-1 hover:bg-[var(--color-bg-elevated)] disabled:opacity-30 rounded transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => navigateVersion('next')}
                  disabled={!viewingPrompt || history.findIndex(p => p.version === viewingPrompt.version) === 0}
                  className="p-1 hover:bg-[var(--color-bg-elevated)] disabled:opacity-30 rounded transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="prose prose-invert prose-teal max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-li:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingPrompt?.content || ''}</ReactMarkdown>
            </div>
          </div>
          <div className="flex justify-between items-center pt-6 mt-6 border-t border-[var(--color-border)]">
            <div className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
              <History className="h-3 w-3" />
              Last modified: {viewingPrompt && new Date(viewingPrompt.created_at).toLocaleString()}
            </div>
            <Button variant="secondary" onClick={() => setViewingPromptId(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
