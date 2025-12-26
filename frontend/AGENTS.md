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

- **TelegramAccount**: Primary Key `id` (int).
- **Folder**: Primary Key `id` (int).
- **Dialog**: Composite Key `(id, account_id)`. URLs: `/dialogs/{account_id}/{id}`.
- **Message**: Composite Key `(id, dialog_id, account_id)`. URLs: `/messages/{account_id}/{dialog_id}/{id}`.
- **VacancyReview**: Primary Key `id` (int). References `(message_id, dialog_id, account_id)`.
- **VacancyProgress**: Primary Key `id` (int). References `review_id`.

## Authentication Flow

1. **Register**: `POST /auth/register?email={email}&password={password}&full_name={name}`
2. **Login**: `POST /auth/login` (Body: `username={email}&password={password}` as `application/x-www-form-urlencoded`) -> Returns `{ access_token, token_type }`.
3. **Session**: `GET /users/me` (requires Bearer token) returns current user.

---

## API Reference (`/api/v1`)

### Accounts

- `GET /accounts`: List user's TG accounts.
- `POST /accounts`: Create account. Body: `TelegramAccountCreate`.
- `GET /accounts/{id}`: Get account by ID.
- `PATCH /accounts/{id}`: Update account. Body: `TelegramAccountUpdate`.
- `DELETE /accounts/{id}`: Delete account.

### Folders

- `GET /folders`: List folders.
- `POST /folders`: Create folder. Body: `FolderCreate`.
- `GET /folders/{id}`: Get folder by ID.
- `PATCH /folders/{id}`: Update folder. Body: `FolderUpdate`.
- `DELETE /folders/{id}`: Delete folder.

### Dialogs

- `GET /dialogs`: List all dialogs across all user accounts.
- `POST /dialogs`: Create dialog. Body: `DialogCreate`.
- `GET /dialogs/{account_id}/{id}`: Get specific dialog.
- `PATCH /dialogs/{account_id}/{id}`: Update dialog. Body: `DialogUpdate`.
- `DELETE /dialogs/{account_id}/{id}`: Delete dialog.

### Messages

- `GET /messages`: List all messages across all user accounts.
- `POST /messages`: Create message. Body: `MessageCreate`.
- `GET /messages/{account_id}/{dialog_id}/{id}`: Get specific message.
- `PATCH /messages/{account_id}/{dialog_id}/{id}`: Update message. Body: `MessageUpdate`.
- `DELETE /messages/{account_id}/{dialog_id}/{id}`: Delete message.

### Telegram native operations

- `POST /telegram/fetch`: Sync all dialogs and messages. Body: `TelegramFetchRequest`.
- `POST /telegram/fetch-chats`: Sync only dialogs. Body: `TelegramFetchChatsRequest`.
- `POST /telegram/fetch-messages`: Sync messages for one chat. Body: `TelegramFetchMessagesRequest`.
- `GET /telegram/folders`: List native TG folders. Returns `[{id, title}]`.
- `POST /telegram/folder/add`: Add chat to TG folder. Body: `TelegramFolderAddRemoveRequest`.
- `POST /telegram/folder/remove`: Remove chat from TG folder. Body: `TelegramFolderAddRemoveRequest`.
- `POST /telegram/folder/create`: Create new TG folder. Body: `TelegramFolderCreateRequest`.
- `DELETE /telegram/folder/{folder_id}`: Delete TG folder.

### Agents

- `POST /agents/review`: Trigger AI review agent. Body: `AgentReviewRequest`.

### Recruitment Workflow

- `GET /reviews`: List all vacancy reviews.
- `POST /reviews`: Create manual review. Body: `VacancyReviewCreate`.
- `GET /reviews/{id}`: Get review detail.
- `PATCH /reviews/{id}`: Update review. Body: `VacancyReviewUpdate`.
- `DELETE /reviews/{id}`: Delete review.
- `GET /progress`: List all vacancy progress records.
- `POST /progress`: Create progress record. Body: `VacancyProgressCreate`.
- `GET /progress/{id}`: Get progress detail.
- `PATCH /progress/{id}`: Update progress. Body: `VacancyProgressUpdate`.
- `DELETE /progress/{id}`: Delete progress.

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
  EXTERNAL_PLATFORM = "EXTERNAL_PLATFORM",
  OTHER = "OTHER",
}

interface ContactDTO {
  type: ContactType;
  value: string;
}

// Request Bodies
interface TelegramAccountCreate {
  id: number;
  api_id: number;
  api_hash: string;
  phone: string;
  name?: string;
  username?: string;
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

interface DialogCreate {
  id: number;
  account_id: number;
  entity_type: DialogType;
  username?: string;
  name?: string;
}

interface DialogUpdate {
  username?: string;
  name?: string;
}

interface MessageCreate {
  id: number;
  dialog_id: number;
  account_id: number;
  from_id?: number;
  from_type?: PeerType;
  text?: string;
  date?: string; // ISO string
}

interface MessageUpdate {
  text?: string;
}

interface VacancyReviewCreate {
  message_id: number;
  dialog_id: number;
  account_id: number;
  decision: VacancyReviewDecision;
  contacts: ContactDTO[];
  vacancy_position: string;
  vacancy_description: string;
  vacancy_requirements?: string;
  salary_fork_from?: number;
  salary_fork_to?: number;
}

interface VacancyReviewUpdate {
  decision?: VacancyReviewDecision;
  contacts?: ContactDTO[];
  vacancy_position?: string;
  vacancy_description?: string;
  vacancy_requirements?: string;
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

// Telegram Operations Requests
interface TelegramFetchRequest {
  new_only?: boolean; // default true
  date_from?: string; // ISO DateTime
  date_to?: string; // ISO DateTime
  max_messages?: number; // default 1000
  folder_id?: number;
  dry_run?: boolean; // default false
}

interface TelegramFetchChatsRequest {
  folder_id?: number;
  dry_run?: boolean; // default false
}

interface TelegramFetchMessagesRequest {
  chat_id: number;
  new_only?: boolean; // default true
  date_from?: string;
  date_to?: string;
  max_messages?: number; // default 1000
  dry_run?: boolean; // default false
}

interface TelegramFolderAddRemoveRequest {
  folder_id: number;
  chat_id: number;
}

interface TelegramFolderCreateRequest {
  title: string;
  chat_id?: number;
}

interface AgentReviewRequest {
  max_messages?: number;
}
```

## Implementation Guidelines

- **Strict Ownership**: You cannot access resources not owned by your `TelegramAccount`. The backend enforces this via `current_user` lookups.
- **Hierarchical Filtering**: Dialogs, Messages, and Reviews are grouped by `account_id`. Always include `account_id` and `dialog_id` in composite keys.
- **Error Handling**:
  - `401`: Redirect to login.
  - `403`: Forbidden (Ownership/RBAC).
  - `404`: Not Found.
  - `422`: Validation error (check request body against schema).
- **State Management**: Prefer caching by the full composite key for Dialogs and Messages (e.g., `dialog_id:account_id`).
