import { useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { usePrompts, useCreatePrompt, useUpdatePrompt, useDeletePrompt } from '@/hooks'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Textarea, Modal, Spinner } from '@/components/ui'
import { type Prompt } from '@/api/prompts'

export function PromptsPage() {
  const { data: prompts = [], isLoading } = usePrompts()
  const createPrompt = useCreatePrompt()
  const updatePrompt = useUpdatePrompt()
  const deletePrompt = useDeletePrompt()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', content: '' })

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
    setViewingPrompt(prompt)
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
          <h1 className="text-3xl font-extrabold tracking-tight">Agent Prompts</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage AI prompts for message analysis</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl shadow-lg">
          <Plus className="h-5 w-5" />
          Add Prompt
        </Button>
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
        open={!!viewingPrompt}
        onClose={() => setViewingPrompt(null)}
        title={viewingPrompt?.name || ''}
        className="max-w-4xl w-[90vw] max-h-[85vh] flex flex-col"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {viewingPrompt?.description && (
            <p className="text-[var(--color-text-secondary)] mb-6 pb-6 border-b border-[var(--color-border)]">
              {viewingPrompt.description}
            </p>
          )}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="prose prose-invert prose-teal max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-li:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingPrompt?.content || ''}</ReactMarkdown>
            </div>
          </div>
          <div className="flex justify-end pt-6 mt-6 border-t border-[var(--color-border)]">
            <Button variant="secondary" onClick={() => setViewingPrompt(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
