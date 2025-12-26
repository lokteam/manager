# Front requirements

# React & Frontend Development Standards

This rule defines the coding standards, patterns, and architectural choices for the React-based frontend of the Manager project. Follow these strictly to ensure a maintainable, high-performance, and polished UI.

## Tech Stack

- **Framework**: React 19+ (Functional Components, Hooks)
- **Build Tool**: Vite
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI based)
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router
- **State Management**: Zustand (Client state), React Query (Server state)
- **Icons**: Lucide React

## Component Guidelines

- **Functional Components**: Always use `export function ComponentName() {}` or `const ComponentName = () => {}`.
- **Props**: Define props using interfaces. Use destructuring with default values.
- **Small Components**: Break down large components into smaller, single-responsibility sub-components.
- **Lucide Icons**: Use Lucide icons for all UI iconography.

## Styling & UX

- **Responsive Design**: Mobile-first approach using Tailwind's `sm:`, `md:`, `lg:` modifiers.
- **Dark Mode**: Support dark mode using Tailwind's `dark:` class.
- **Consistency**: Use the standard spacing and color palette defined in `tailwind.config.js`.
- **Polish**: Add subtle transitions and loading states (Skeletons) for all async actions.

## State & Data Fetching

- **Server State**: Use `useQuery` for fetching and `useMutation` for updates/deletes.
- **Loading/Error**: Always handle loading and error states explicitly in the UI.
- **Centralized API**: Create an `api/` directory with service functions for each resource (Accounts, Dialogs, etc.) as specified in the `@backend-api` rule.
- **Auth Token**: Securely store the JWT and inject it into the `Authorization` header using an Axios or Fetch interceptor.

## Folder Structure

```text
src/
  api/          # API client and service functions
  components/   # Reusable UI components (shadcn)
  features/     # Feature-specific components and logic
  hooks/        # Custom React hooks
  lib/          # Utilities (utils.ts, constants.ts)
  pages/        # Page-level components (routes)
  store/        # Zustand stores
  types/        # TypeScript interfaces/enums
```

## Performance & Quality

- **Memoization**: Use `useMemo` and `useCallback` for expensive calculations or to prevent unnecessary re-renders of children.
- **Form Handling**: Use `react-hook-form` with `zod` for validation.
- **Type Safety**: Avoid `any`. Use strict types for all API responses.
- **Clean Code**: 2-space indentation. No unused imports. Group imports (React, libraries, local).

---

# Backend spec

# Backend API & Data Model Specification

This rule provides the full context of the Manager Backend API, its authentication patterns, and the data models. Use this when implementing frontend features, API clients, or state management.

## Backend Architecture

- **Base URL**: `http://localhost:8000`
- **Prefix**: `/api/v1`
- **Auth**: JWT Bearer token in `Authorization` header.
- **SSO**: Google SSO supported via `/auth/sso/google/login`.

## Core Entities & Primary Keys

- **TelegramAccount**: PK `id` (int). Linked to `User`.
- **Folder**: PK `id` (int). Linked to `User`.
- **Dialog**: PK `id` (int). Unique constraint `(telegram_id, account_id)`.
- **Message**: PK `id` (int). Unique constraint `(telegram_id, dialog_id)`.
- **VacancyReview**: PK `id` (int). Unique constraint `message_id`.
- **VacancyProgress**: PK `id` (int). Unique constraint `review_id`.
- **Prompt**: Composite PK `(id, version)`.

## Authentication Flow

1. **Register**: `POST /auth/register?email={email}&password={password}&full_name={name}`
2. **Login**: `POST /auth/login` (Body: `username={email}&password={password}` as `application/x-www-form-urlencoded`) -> Returns `{ access_token, token_type }`.
3. **Session**: `GET /users/me` (requires Bearer token) returns current user.
4. **SSO**: `GET /auth/sso/google/login` redirects to Google. Callback at `/auth/sso/google/callback` redirects to frontend with token.

---

## API Reference (`/api/v1`)

### Accounts

- `GET /accounts`: List user's TG accounts.
- `POST /accounts`: Initiate account linking. Body: `TelegramAccountCreate`. Returns `pending`.
- `POST /accounts/confirm`: Confirm linking with SMS code. Body: `TelegramAccountConfirm`.
- `GET /accounts/{id}`: Get account by ID.
- `PATCH /accounts/{id}`: Update account (name/username). Body: `TelegramAccountUpdate`.
- `DELETE /accounts/{id}`: Unlink account.

### Folders (Internal)

- `GET /folders`: List internal folders.
- `POST /folders`: Create internal folder. Body: `FolderCreate`.
- `GET /folders/{id}`: Get folder by ID.
- `PATCH /folders/{id}`: Update folder name. Body: `FolderUpdate`.
- `DELETE /folders/{id}`: Delete folder.

### Dialogs

- `GET /dialogs`: List all dialogs across all accounts (triggers background sync).
- `GET /dialogs/{account_id}/{id}`: Get specific dialog.

### Telegram native operations

- `POST /telegram/fetch`: Sync dialogs and messages for an account. Body: `TelegramFetchRequest`.
- `POST /telegram/fetch-chats`: Sync dialogs for an account. Body: `TelegramFetchChatsRequest`.
- `POST /telegram/fetch-messages`: Sync messages for one chat. Body: `TelegramFetchMessagesRequest`.
- `GET /telegram/folders`: List native TG folders for an account.
- `POST /telegram/folder/add`: Add chat to TG folder. Body: `TelegramFolderAddRemoveRequest`.
- `POST /telegram/folder/remove`: Remove chat from TG folder. Body: `TelegramFolderAddRemoveRequest`.
- `POST /telegram/folder/bulk-add`: Add multiple chats to TG folder. Body: `TelegramFolderBulkAddRemoveRequest`.
- `POST /telegram/folder/bulk-remove`: Remove multiple chats from TG folder. Body: `TelegramFolderBulkAddRemoveRequest`.
- `POST /telegram/folder/create`: Create new TG folder. Body: `TelegramFolderCreateRequest`.
- `PATCH /telegram/folder/rename`: Rename TG folder. Body: `TelegramFolderRenameRequest`.
- `DELETE /telegram/folder/{folder_id}?account_id={acc_id}`: Delete TG folder.

### Agents

- `POST /agents/review`: Trigger AI review agent. Body: `AgentReviewRequest`.

### Prompts

- `GET /prompts`: List latest versions of active prompts.
- `GET /prompts/trash`: List latest versions of deleted prompts.
- `POST /prompts`: Create new prompt (v1). Body: `PromptCreate`.
- `GET /prompts/{id}`: Get latest version of a prompt.
- `GET /prompts/{id}/history`: Get all versions of a prompt.
- `PATCH /prompts/{id}`: Create a new version of a prompt. Body: `PromptUpdate`.
- `DELETE /prompts/{id}`: Soft-delete a prompt (all versions).
- `POST /prompts/{id}/restore`: Restore a soft-deleted prompt.

### Recruitment Workflow

- `GET /reviews`: List vacancy reviews for current user.
- `GET /reviews/{id}`: Get review detail with extra dialog/account info.
- `PATCH /reviews/{id}`: Update review. Body: `VacancyReviewUpdate`.
- `DELETE /reviews/{id}`: Delete review.
- `GET /progress`: List progress records with nested review data.
- `POST /progress`: Create progress record. Body: `VacancyProgressCreate`.
- `GET /progress/{id}`: Get progress detail with nested review.
- `PATCH /progress/{id}`: Update progress status/comment. Body: `VacancyProgressUpdate`.
- `DELETE /progress/{id}`: Delete progress record.

---

## TypeScript Interfaces

```typescript
// Enums
enum DialogType {
  USER = "User",
  GROUP = "Group",
  CHANNEL = "Channel",
}
enum PeerType {
  USER = "User",
  CHAT = "Chat",
  CHANNEL = "Channel",
}
enum VacancyReviewDecision {
  DISMISS = "DISMISS",
  APPROVE = "APPROVE",
}
enum VacancyProgressStatus {
  NEW = "NEW",
  CONTACT = "CONTACT",
  IGNORE = "IGNORE",
  INTERVIEW = "INTERVIEW",
  REJECT = "REJECT",
  OFFER = "OFFER",
}
enum ContactType {
  PHONE = "PHONE",
  EMAIL = "EMAIL",
  TELEGRAM_USERNAME = "TELEGRAM_USERNAME",
  TELEGRAM_ID = "TELEGRAM_ID",
  EXTERNAL_PLATFORM = "EXTERNAL_PLATFORM",
  OTHER = "OTHER",
}
enum Seniority {
  TRAINEE = "TRAINEE",
  JUNIOR = "JUNIOR",
  MIDDLE = "MIDDLE",
  SENIOR = "SENIOR",
  LEAD = "LEAD",
}

interface ContactDTO {
  type: ContactType;
  value: string;
}

// Request Bodies
interface TelegramAccountCreate {
  api_id: number;
  api_hash: string;
  phone: string;
}

interface TelegramAccountConfirm {
  phone: string;
  code: string;
}

interface TelegramAccountUpdate {
  name?: string;
  username?: string;
}

interface FolderCreate {
  name: string;
}
interface FolderUpdate {
  name: string;
}

interface VacancyReviewUpdate {
  decision?: VacancyReviewDecision;
  seniority?: Seniority;
  contacts?: ContactDTO[];
  vacancy_position?: string;
  vacancy_description?: string;
  vacancy_requirements?: string[];
  salary_fork_from?: number;
  salary_fork_to?: number;
}

interface VacancyProgressCreate {
  review_id: number;
  status?: VacancyProgressStatus;
  comment?: string;
}

interface VacancyProgressUpdate {
  status?: VacancyProgressStatus;
  comment?: string;
}

interface PromptCreate {
  name: string;
  description?: string;
  content: string;
}

interface PromptUpdate {
  name?: string;
  description?: string;
  content?: string;
}

// Telegram Operations Requests
interface TelegramFetchRequest {
  account_id: number;
  new_only?: boolean;
  date_from?: string;
  date_to?: string;
  max_messages?: number;
  folder_id?: number;
  dry_run?: boolean;
}

interface TelegramFetchChatsRequest {
  account_id: number;
  folder_id?: number;
  dry_run?: boolean;
}

interface TelegramFetchMessagesRequest {
  account_id: number;
  chat_id: number;
  new_only?: boolean;
  max_messages?: number;
  dry_run?: boolean;
}

interface TelegramFolderAddRemoveRequest {
  account_id: number;
  folder_id: number;
  chat_id: number;
}

interface TelegramFolderBulkAddRemoveRequest {
  account_id: number;
  folder_id: number;
  chat_ids: number[];
}

interface TelegramFolderCreateRequest {
  account_id: number;
  title: string;
  chat_id?: number;
}

interface TelegramFolderRenameRequest {
  account_id: number;
  folder_id: number;
  title: string;
}

interface AgentReviewRequest {
  prompt_id: number;
  max_messages?: number;
  unreviewed_only?: boolean;
  account_id?: number;
  chat_id?: number;
  folder_id?: number;
}
```

## Implementation Guidelines

- **Ownership**: Resources (Accounts, Prompts, etc.) are tied to `current_user`. The backend enforces access control.
- **Hierarchical Filtering**: Most Telegram operations and Agent reviews require an `account_id`.
- **Error Handling**:
  - `401`: Unauthorized (Login required).
  - `403`: Forbidden (Access denied).
  - `404`: Not Found.
  - `422`: Validation error (schema mismatch).
- **Prompt Versioning**: Prompts are immutable by version. Updating a prompt creates a new version. AI reviews store the `prompt_id` and `prompt_version` used.

