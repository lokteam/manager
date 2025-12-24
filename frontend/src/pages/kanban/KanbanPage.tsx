import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Mail,
  Phone,
  AtSign,
  DollarSign,
  Briefcase,
  FileText,
  X,
} from 'lucide-react'
import {
  reviewsApi,
  progressApi,
  type VacancyReview,
  type VacancyProgress,
  VacancyProgressStatus,
  ContactType,
} from '@/api'
import {
  Button,
  Badge,
  Spinner,
  EmptyState,
  Modal,
  Textarea,
  useToast,
} from '@/components/ui'
import { HttpError } from '@/api/http'
import { cn, formatSalary, truncate } from '@/lib/utils'

const COLUMNS: { status: VacancyProgressStatus; label: string; color: string }[] = [
  { status: VacancyProgressStatus.NEW, label: 'New', color: 'new' },
  { status: VacancyProgressStatus.CONTACT, label: 'Contact HR', color: 'contact' },
  { status: VacancyProgressStatus.IGNORE, label: 'Ignored', color: 'ignore' },
  { status: VacancyProgressStatus.INTERVIEW, label: 'Interview', color: 'interview' },
  { status: VacancyProgressStatus.REJECT, label: 'Rejected', color: 'reject' },
  { status: VacancyProgressStatus.OFFER, label: 'Offer', color: 'offer' },
]

interface KanbanCard {
  review: VacancyReview
  progress: VacancyProgress
}

export function KanbanPage() {
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)

  const queryClient = useQueryClient()
  const { success, error } = useToast()

  // Queries
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: reviewsApi.getReviews,
  })

  const { data: progressList, isLoading: progressLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: progressApi.getProgressList,
  })

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status?: VacancyProgressStatus; comment?: string } }) =>
      progressApi.updateProgress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      success('Status updated')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update status')
    },
  })

  // Build cards by joining reviews and progress
  const cardsByStatus = useMemo(() => {
    if (!reviews || !progressList) return {} as Record<VacancyProgressStatus, KanbanCard[]>

    const progressByReviewId = new Map(progressList.map((p) => [p.review_id, p]))

    const cards: KanbanCard[] = reviews
      .map((review) => {
        const progress = progressByReviewId.get(review.id)
        if (!progress) return null
        return { review, progress }
      })
      .filter((card): card is KanbanCard => card !== null)

    const grouped: Record<VacancyProgressStatus, KanbanCard[]> = {
      [VacancyProgressStatus.NEW]: [],
      [VacancyProgressStatus.CONTACT]: [],
      [VacancyProgressStatus.IGNORE]: [],
      [VacancyProgressStatus.INTERVIEW]: [],
      [VacancyProgressStatus.REJECT]: [],
      [VacancyProgressStatus.OFFER]: [],
    }

    cards.forEach((card) => {
      grouped[card.progress.status].push(card)
    })

    return grouped
  }, [reviews, progressList])

  const handleMoveCard = (card: KanbanCard, newStatus: VacancyProgressStatus) => {
    updateProgressMutation.mutate({
      id: card.progress.id,
      data: { status: newStatus },
    })
  }

  const isLoading = reviewsLoading || progressLoading

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const totalCards = Object.values(cardsByStatus).flat().length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban Board</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {totalCards} {totalCards === 1 ? 'vacancy' : 'vacancies'} in pipeline
          </p>
        </div>
      </div>

      {totalCards === 0 ? (
        <EmptyState
          icon={<LayoutDashboard className="h-12 w-12" />}
          title="No vacancies yet"
          description="Run the agent to fetch and filter job vacancies from your Telegram messages"
          action={
            <a href="/agent">
              <Button>Configure Agent</Button>
            </a>
          }
        />
      ) : (
        /* Kanban Board */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              column={column}
              cards={cardsByStatus[column.status] || []}
              onCardClick={setSelectedCard}
              onMoveCard={handleMoveCard}
              allColumns={COLUMNS}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCard && (
        <VacancyDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdateProgress={(data) => {
            updateProgressMutation.mutate({ id: selectedCard.progress.id, data })
          }}
          isUpdating={updateProgressMutation.isPending}
          columns={COLUMNS}
        />
      )}
    </div>
  )
}

// Kanban Column Component
interface KanbanColumnProps {
  column: { status: VacancyProgressStatus; label: string; color: string }
  cards: KanbanCard[]
  onCardClick: (card: KanbanCard) => void
  onMoveCard: (card: KanbanCard, newStatus: VacancyProgressStatus) => void
  allColumns: typeof COLUMNS
}

function KanbanColumn({ column, cards, onCardClick, onMoveCard, allColumns }: KanbanColumnProps) {
  const columnIndex = allColumns.findIndex((c) => c.status === column.status)
  const prevColumn = columnIndex > 0 ? allColumns[columnIndex - 1] : null
  const nextColumn = columnIndex < allColumns.length - 1 ? allColumns[columnIndex + 1] : null

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-[var(--color-bg-secondary)]">
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
        <div className="flex items-center gap-2">
          <Badge variant={column.color as 'new' | 'contact' | 'ignore' | 'interview' | 'reject' | 'offer'}>
            {column.label}
          </Badge>
          <span className="text-sm text-[var(--color-text-muted)]">{cards.length}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {cards.map((card) => (
          <VacancyCard
            key={card.review.id}
            card={card}
            onClick={() => onCardClick(card)}
            onMovePrev={prevColumn ? () => onMoveCard(card, prevColumn.status) : undefined}
            onMoveNext={nextColumn ? () => onMoveCard(card, nextColumn.status) : undefined}
          />
        ))}
        {cards.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--color-text-muted)]">
            No vacancies
          </div>
        )}
      </div>
    </div>
  )
}

// Vacancy Card Component
interface VacancyCardProps {
  card: KanbanCard
  onClick: () => void
  onMovePrev?: () => void
  onMoveNext?: () => void
}

function VacancyCard({ card, onClick, onMovePrev, onMoveNext }: VacancyCardProps) {
  const { review } = card

  return (
    <div
      className="group cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 transition-all hover:border-[var(--color-accent)] hover:shadow-lg"
      onClick={onClick}
    >
      {/* Title */}
      <h4 className="font-medium text-[var(--color-text-primary)]">
        {truncate(review.vacancy_position, 40)}
      </h4>

      {/* Salary */}
      {(review.salary_fork_from || review.salary_fork_to) && (
        <div className="mt-1 flex items-center gap-1 text-sm text-[var(--color-success)]">
          <DollarSign className="h-3.5 w-3.5" />
          {formatSalary(review.salary_fork_from, review.salary_fork_to)}
        </div>
      )}

      {/* Description preview */}
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        {truncate(review.vacancy_description, 80)}
      </p>

      {/* Contacts indicator */}
      {review.contacts.length > 0 && (
        <div className="mt-2 flex gap-1">
          {review.contacts.slice(0, 3).map((contact, i) => (
            <ContactIcon key={i} type={contact.type} />
          ))}
          {review.contacts.length > 3 && (
            <span className="text-xs text-[var(--color-text-muted)]">
              +{review.contacts.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Quick move buttons */}
      <div className="mt-2 flex justify-between opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onMovePrev?.()
          }}
          disabled={!onMovePrev}
          className="px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onMoveNext?.()
          }}
          disabled={!onMoveNext}
          className="px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Contact Icon Component
function ContactIcon({ type }: { type: ContactType }) {
  const icons: Record<ContactType, typeof Mail> = {
    [ContactType.EMAIL]: Mail,
    [ContactType.PHONE]: Phone,
    [ContactType.TELEGRAM_USERNAME]: AtSign,
    [ContactType.EXTERNAL_PLATFORM]: ExternalLink,
    [ContactType.OTHER]: FileText,
  }

  const Icon = icons[type] || FileText

  return (
    <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
      <Icon className="h-3 w-3" />
    </div>
  )
}

// Detail Modal Component
interface VacancyDetailModalProps {
  card: KanbanCard
  onClose: () => void
  onUpdateProgress: (data: { status?: VacancyProgressStatus; comment?: string }) => void
  isUpdating: boolean
  columns: typeof COLUMNS
}

function VacancyDetailModal({
  card,
  onClose,
  onUpdateProgress,
  isUpdating,
  columns,
}: VacancyDetailModalProps) {
  const [comment, setComment] = useState(card.progress.comment || '')
  const { review, progress } = card

  const handleStatusChange = (status: VacancyProgressStatus) => {
    onUpdateProgress({ status })
  }

  const handleCommentSave = () => {
    onUpdateProgress({ comment })
  }

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{review.vacancy_position}</h2>
          {(review.salary_fork_from || review.salary_fork_to) && (
            <p className="mt-1 text-lg text-[var(--color-success)]">
              {formatSalary(review.salary_fork_from, review.salary_fork_to)}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Status selector */}
      <div className="mb-6">
        <label className="label">Status</label>
        <div className="flex flex-wrap gap-2">
          {columns.map((col) => (
            <button
              key={col.status}
              onClick={() => handleStatusChange(col.status)}
              disabled={isUpdating}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium transition-all',
                progress.status === col.status
                  ? 'bg-[var(--color-accent)] text-black'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
              )}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <h3 className="label flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Description
        </h3>
        <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
          {review.vacancy_description}
        </p>
      </div>

      {/* Requirements */}
      {review.vacancy_requirements && (
        <div className="mb-6">
          <h3 className="label flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Requirements
          </h3>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
            {review.vacancy_requirements}
          </p>
        </div>
      )}

      {/* Contacts */}
      {review.contacts.length > 0 && (
        <div className="mb-6">
          <h3 className="label">Contacts</h3>
          <div className="space-y-2">
            {review.contacts.map((contact, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <ContactIcon type={contact.type} />
                <span className="text-[var(--color-text-secondary)]">{contact.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <h3 className="label">Notes</h3>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add your notes about this vacancy..."
          className="min-h-[80px]"
        />
        <div className="mt-2 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCommentSave}
            loading={isUpdating}
            disabled={comment === (card.progress.comment || '')}
          >
            Save Notes
          </Button>
        </div>
      </div>

      {/* Source info */}
      <div className="border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-muted)]">
        Source: Account {review.account_id} / Dialog {review.dialog_id} / Message {review.message_id}
      </div>
    </Modal>
  )
}

