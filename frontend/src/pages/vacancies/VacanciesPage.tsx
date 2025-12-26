import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ExternalLink,
  Mail,
  Phone,
  AtSign,
  Briefcase,
  FileText,
  X,
  MessageCircle,
  Search,
  ChevronRight,
  Trash2,
} from "lucide-react";
import {
  reviewsApi,
  progressApi,
  accountsApi,
  promptsApi,
  type VacancyReview,
  type VacancyProgress,
  type Prompt,
  type ContactDTO,
  VacancyProgressStatus,
  ContactType,
  Seniority,
} from "@/api";
import {
  Button,
  Badge,
  Spinner,
  EmptyState,
  Modal,
  Textarea,
  Input,
  Select,
  useToast,
} from "@/components/ui";
import { HttpError } from "@/api/http";
import { cn, formatSalary, formatExperience } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: VacancyProgressStatus.NEW, label: "New", color: "new" },
  {
    value: VacancyProgressStatus.CONTACT,
    label: "Contact HR",
    color: "contact",
  },
  { value: VacancyProgressStatus.IGNORE, label: "Ignored", color: "ignore" },
  {
    value: VacancyProgressStatus.INTERVIEW,
    label: "Interview",
    color: "interview",
  },
  { value: VacancyProgressStatus.REJECT, label: "Rejected", color: "reject" },
  { value: VacancyProgressStatus.OFFER, label: "Offer", color: "offer" },
];

const SENIORITY_OPTIONS = [
  { value: "ALL", label: "All Seniority" },
  { value: Seniority.TRAINEE, label: "Trainee" },
  { value: Seniority.JUNIOR, label: "Junior" },
  { value: Seniority.MIDDLE, label: "Middle" },
  { value: Seniority.SENIOR, label: "Senior" },
  { value: Seniority.LEAD, label: "Lead" },
];

const EXPERIENCE_OPTIONS = [
  { value: "ALL", label: "All Experience" },
  { value: "NOT_SPECIFIED", label: "Not Specified" },
  { value: "0-1", label: "0-1 years", min: 0, max: 1 },
  { value: "1-3", label: "1-3 years", min: 1, max: 3 },
  { value: "3-5", label: "3-5 years", min: 3, max: 5 },
  { value: "5-8", label: "5-8 years", min: 5, max: 8 },
  { value: "8+", label: "8+ years", min: 8, max: 100 },
];

interface VacancyEntry {
  review: VacancyReview;
  progress: VacancyProgress;
}

export function VacanciesPage() {
  const [selectedVacancy, setSelectedVacancy] = useState<VacancyEntry | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [seniorityFilter, setSeniorityFilter] = useState("ALL");
  const [experienceFilter, setExperienceFilter] = useState("ALL");
  const [accountIdFilter, setAccountIdFilter] = useState("ALL");

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Queries
  const { data: progressList, isLoading: progressLoading } = useQuery({
    queryKey: ["progress"],
    queryFn: progressApi.getProgressList,
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: accountsApi.getAccounts,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { status?: VacancyProgressStatus; comment?: string };
    }) => progressApi.updateProgress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      success("Updated successfully");
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : "Failed to update");
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: reviewsApi.deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      setSelectedVacancy(null);
      success("Review deleted");
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : "Failed to delete review");
    },
  });

  // Build entries by joining reviews and progress
  const entries = useMemo(() => {
    if (!progressList) return [];

    return progressList
      .filter((p) => p.review)
      .map((progress) => ({
        review: progress.review!,
        progress,
      }))
      .sort((a, b) => b.review.id - a.review.id); // Newest first
  }, [progressList]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        entry.review.vacancy_position
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        entry.review.vacancy_description
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || entry.progress.status === statusFilter;

      const matchesSeniority =
        seniorityFilter === "ALL" || entry.review.seniority === seniorityFilter;

      const matchesExperience = (() => {
        if (experienceFilter === "ALL") return true;
        if (experienceFilter === "NOT_SPECIFIED") {
          return (
            !entry.review.experience ||
            (entry.review.experience.from === null &&
              entry.review.experience.to === null)
          );
        }

        const option = EXPERIENCE_OPTIONS.find(
          (o) => o.value === experienceFilter
        );
        if (!option) return true;

        const exp = entry.review.experience;
        if (!exp) return false;

        const vMin = exp.from ?? 0;
        const vMax = exp.to ?? 100;

        // Check for overlap: max(start1, start2) <= min(end1, end2)
        const start = Math.max(option.min!, vMin);
        const end = Math.min(option.max!, vMax);

        return start <= end;
      })();

      const matchesAccount =
        accountIdFilter === "ALL" ||
        entry.review.account_id.toString() === accountIdFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSeniority &&
        matchesAccount &&
        matchesExperience
      );
    });
  }, [
    entries,
    search,
    statusFilter,
    seniorityFilter,
    accountIdFilter,
    experienceFilter,
  ]);

  const isLoading = progressLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Vacancies ({filteredEntries.length})
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Manage and track your job applications
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            placeholder="Search positions or descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="w-40">
            <Select
              value={seniorityFilter}
              onChange={(e) => setSeniorityFilter(e.target.value)}
              options={SENIORITY_OPTIONS}
            />
          </div>

          <div className="w-40">
            <Select
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              options={EXPERIENCE_OPTIONS}
            />
          </div>

          <div className="w-48">
            <Select
              value={accountIdFilter}
              onChange={(e) => setAccountIdFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Accounts" },
                ...(accounts?.map((acc) => ({
                  value: acc.id.toString(),
                  label: acc.name || acc.phone,
                })) || []),
              ]}
            />
          </div>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-12 w-12" />}
          title={entries.length === 0 ? "No vacancies yet" : "No matches found"}
          description={
            entries.length === 0
              ? "Run the agent to fetch and filter job vacancies from your Telegram messages"
              : "Try adjusting your filters to find what you're looking for"
          }
          action={
            entries.length === 0 ? (
              <a href="/agent">
                <Button>Configure Agent</Button>
              </a>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setSeniorityFilter("ALL");
                  setExperienceFilter("ALL");
                  setAccountIdFilter("ALL");
                }}
              >
                Clear Filters
              </Button>
            )
          }
        />
      ) : (
        /* Vacancies List */
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <VacancyListItem
              key={entry.review.id}
              entry={entry}
              onClick={() => setSelectedVacancy(entry)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedVacancy && (
        <VacancyDetailModal
          entry={selectedVacancy}
          onClose={() => setSelectedVacancy(null)}
          onUpdateProgress={(data) => {
            updateProgressMutation.mutate({
              id: selectedVacancy.progress.id,
              data,
            });
            // Update local state to reflect changes in modal
            if (data.status) {
              setSelectedVacancy({
                ...selectedVacancy,
                progress: { ...selectedVacancy.progress, status: data.status },
              });
            }
          }}
          isUpdating={updateProgressMutation.isPending}
          onDelete={() => {
            if (
              confirm("Are you sure you want to delete this vacancy review?")
            ) {
              deleteReviewMutation.mutate(selectedVacancy.review.id);
            }
          }}
          isDeleting={deleteReviewMutation.isPending}
        />
      )}
    </div>
  );
}

// List Item Component
function VacancyListItem({
  entry,
  onClick,
}: {
  entry: VacancyEntry;
  onClick: () => void;
}) {
  const { review, progress } = entry;
  const [showPrompt, setShowPrompt] = useState(false);

  const statusOption = STATUS_OPTIONS.find((s) => s.value === progress.status);

  return (
    <div
      className="group flex cursor-pointer flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 transition-all hover:border-[var(--color-accent)] hover:shadow-md md:flex-row md:items-center"
      onClick={onClick}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between md:justify-start md:gap-3">
          <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
            {review.vacancy_position}
          </h3>
          <div className="flex gap-2">
            {review.seniority && (
              <Badge
                variant="default"
                className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              >
                {review.seniority}
              </Badge>
            )}
            {(review.experience?.from || review.experience?.to) && (
              <Badge
                variant="default"
                className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              >
                {formatExperience(review.experience.from, review.experience.to)}
              </Badge>
            )}
            <Badge
              variant={
                (statusOption?.color as
                  | "new"
                  | "contact"
                  | "ignore"
                  | "interview"
                  | "reject"
                  | "offer") || "new"
              }
            >
              {statusOption?.label || progress.status}
            </Badge>
          </div>
        </div>

        <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">
          {review.vacancy_description}
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t border-[var(--color-border)]/50 mt-2">
          {(review.salary_fork_from || review.salary_fork_to) && (
            <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-success)]">
              {formatSalary(review.salary_fork_from, review.salary_fork_to)}
            </div>
          )}
          {(review.experience?.from || review.experience?.to) && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
              <Briefcase className="h-4 w-4" />
              {formatExperience(review.experience.from, review.experience.to)}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end md:ml-4">
        <ChevronRight className="h-5 w-5 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-accent)]" />
      </div>

      {showPrompt && review.prompt_id && (
        <PromptViewModal
          promptId={review.prompt_id}
          version={review.prompt_version}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  );
}

// Contact Icon Component (reused)
function ContactInfo({ contact }: { contact: ContactDTO }) {
  const { value } = contact;

  const config: Record<
    ContactType,
    {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      href?: string;
    }
  > = {
    [ContactType.EMAIL]: {
      icon: Mail,
      label: "Email",
      href: `mailto:${value}`,
    },
    [ContactType.PHONE]: { icon: Phone, label: "Phone", href: `tel:${value}` },
    [ContactType.TELEGRAM_USERNAME]: {
      icon: AtSign,
      label: "Telegram",
      href: value.startsWith("@")
        ? `https://t.me/${value.substring(1)}`
        : `https://t.me/${value}`,
    },
    [ContactType.TELEGRAM_ID]: {
      icon: MessageCircle,
      label: "Telegram ID",
      href: isNaN(Number(value)) ? `https://t.me/${value}` : undefined, // If it's converted to username, make it a link
    },
    [ContactType.EXTERNAL_PLATFORM]: {
      icon: ExternalLink,
      label: "Link",
      href: value.startsWith("http") ? value : `https://${value}`,
    },
    [ContactType.OTHER]: { icon: FileText, label: "Contact" },
  };

  const item = config[contact.type] || { icon: FileText, label: "Contact" };
  const Icon = item.icon;

  const content = (
    <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] p-2 text-sm transition-colors hover:bg-[var(--color-bg-tertiary)]">
      <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-[10px] font-medium uppercase text-[var(--color-text-muted)]">
          {item.label}
        </span>
        <span className="truncate text-[var(--color-text-secondary)]">
          {value}
        </span>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block no-underline"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </a>
    );
  }

  return content;
}

// Small version for list items
// (removed unused ContactIconSmall)

function PromptViewModal({
  promptId,
  version,
  onClose,
}: {
  promptId: number;
  version?: number;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["prompts", promptId, "history"],
    queryFn: () => promptsApi.promptsApi.getPromptHistory(promptId),
  });

  const prompt = useMemo(() => {
    if (!history) return null;
    if (version) {
      return history.find((p: Prompt) => p.version === version) || history[0];
    }
    return history[0];
  }, [history, version]);

  return (
    <Modal open onClose={onClose} className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {prompt ? `${prompt.name} (v${prompt.version})` : "Prompt Details"}
        </h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : prompt ? (
        <div className="space-y-4">
          {prompt.description && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              {prompt.description}
            </p>
          )}
          <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-4 overflow-y-auto max-h-[60vh]">
            <div className="prose prose-invert prose-teal max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-li:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {prompt.content}
              </ReactMarkdown>
            </div>
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            Created at: {new Date(prompt.created_at).toLocaleString()}
          </div>
        </div>
      ) : (
        <p>Prompt not found</p>
      )}
    </Modal>
  );
}

// Detail Modal Component (adapted)
interface VacancyDetailModalProps {
  entry: VacancyEntry;
  onClose: () => void;
  onUpdateProgress: (data: {
    status?: VacancyProgressStatus;
    comment?: string;
  }) => void;
  isUpdating: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}

function VacancyDetailModal({
  entry,
  onClose,
  onUpdateProgress,
  isUpdating,
  onDelete,
  isDeleting,
}: VacancyDetailModalProps) {
  const { review, progress } = entry;
  const [comment, setComment] = useState(progress.comment || "");
  const [showPrompt, setShowPrompt] = useState(false);

  const handleStatusChange = (status: VacancyProgressStatus) => {
    onUpdateProgress({ status });
  };

  const handleCommentSave = () => {
    onUpdateProgress({ comment });
  };

  const getTelegramLink = () => {
    if (review.dialog_username) {
      return `https://t.me/${review.dialog_username}/${review.telegram_message_id}`;
    }
    const cleanId = review.telegram_dialog_id.toString().replace(/^-100/, "");
    return `https://t.me/c/${cleanId}/${review.telegram_message_id}`;
  };

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold">{review.vacancy_position}</h2>
            {review.seniority && (
              <Badge
                variant="default"
                className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              >
                {review.seniority}
              </Badge>
            )}
            {(review.experience?.from || review.experience?.to) && (
              <Badge
                variant="default"
                className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              >
                {formatExperience(review.experience.from, review.experience.to)}
              </Badge>
            )}
            <a
              href={getTelegramLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-xs font-black hover:bg-[var(--color-accent)] hover:text-black transition-all shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Original Message
            </a>
          </div>
          <div className="flex items-center gap-4 mt-1">
            {(review.salary_fork_from || review.salary_fork_to) && (
              <p className="text-lg text-[var(--color-success)] font-bold">
                {formatSalary(review.salary_fork_from, review.salary_fork_to)}
              </p>
            )}
            {(review.experience?.from || review.experience?.to) ? (
              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <Briefcase className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {formatExperience(
                    review.experience.from,
                    review.experience.to
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Briefcase className="h-4 w-4" />
                <span className="text-sm font-medium italic">
                  Exp: Not specified
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <label className="label">Status</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.filter((o) => o.value !== "ALL").map((col) => (
            <button
              key={col.value}
              onClick={() =>
                handleStatusChange(col.value as VacancyProgressStatus)
              }
              disabled={isUpdating}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                progress.status === col.value
                  ? "bg-[var(--color-accent)] text-black"
                  : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
              )}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="space-y-6 overflow-y-auto pr-2"
        style={{ maxHeight: "60vh" }}
      >
        <div>
          <h3 className="label flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Description
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {review.vacancy_description}
          </p>
        </div>

        {review.vacancy_requirements &&
          review.vacancy_requirements.length > 0 && (
            <div>
              <h3 className="label flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Requirements
              </h3>
              <ul className="list-inside list-disc space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                {review.vacancy_requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

        {review.contacts.length > 0 && (
          <div>
            <h3 className="label">Contacts</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {review.contacts.map((contact, i) => (
                <ContactInfo key={i} contact={contact} />
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="label">Notes</h3>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your notes about this vacancy..."
            className="min-h-[100px]"
          />
          <div className="mt-2 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCommentSave}
              loading={isUpdating}
              disabled={comment === (progress.comment || "")}
            >
              Save Notes
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        {review.prompt_id && (
          <button
            onClick={() => setShowPrompt(true)}
            className="w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent-muted)]/20 text-[var(--color-accent)] text-[10px] font-black tracking-wider hover:bg-[var(--color-accent)] hover:text-black transition-all shadow-sm border border-[var(--color-accent)]/30"
          >
            <FileText className="h-3 w-3" />
            Used Prompt
          </button>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-muted)] tracking-tight">
            <span className="opacity-90 font-black">Account: </span>
            <span className="px-2 py-1 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
              {review.account_username
                ? `@${review.account_username.replace(/^@/, "")}`
                : review.account_name || `ID: ${review.account_id}`}
            </span>
            <span className="opacity-90 font-black">From chat: </span>
            <span className="px-2 py-1 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
              {review.dialog_username
                ? `@${review.dialog_username.replace(/^@/, "")}`
                : review.dialog_name || `ID: ${review.dialog_id}`}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--color-error)] hover:bg-[var(--color-error-muted)] hover:text-[var(--color-error)] h-10 px-4"
          onClick={onDelete}
          loading={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Review
        </Button>
      </div>

      {showPrompt && review.prompt_id && (
        <PromptViewModal
          promptId={review.prompt_id}
          version={review.prompt_version}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </Modal>
  );
}
