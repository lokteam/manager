// Enums matching backend spec
export enum DialogType {
  USER = 'User',
  GROUP = 'Group',
  CHANNEL = 'Channel',
}

export enum PeerType {
  USER = 'User',
  CHAT = 'Chat',
  CHANNEL = 'Channel',
}

export enum VacancyReviewDecision {
  DISMISS = 'DISMISS',
  APPROVE = 'APPROVE',
}

export enum VacancyProgressStatus {
  NEW = 'NEW',
  CONTACT = 'CONTACT',
  IGNORE = 'IGNORE',
  INTERVIEW = 'INTERVIEW',
  REJECT = 'REJECT',
  OFFER = 'OFFER',
}

export enum ContactType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  TELEGRAM_USERNAME = 'TELEGRAM_USERNAME',
  EXTERNAL_PLATFORM = 'EXTERNAL_PLATFORM',
  OTHER = 'OTHER',
}

// DTOs
export interface ContactDTO {
  type: ContactType
  value: string
}

export interface User {
  id: number
  email: string
  full_name: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

// Telegram Account
export interface TelegramAccount {
  id: number
  api_id: number
  api_hash: string
  phone: string
  name?: string
  username?: string
}

export interface TelegramAccountCreate {
  api_id: number
  api_hash: string
  phone: string
}

export interface TelegramAccountConfirm {
  phone: string
  code: string
}

export interface TelegramAccountUpdate {
  name?: string
  username?: string
}

// Folder
export interface Folder {
  id: number
  name: string
}

export interface FolderCreate {
  name: string
}

export interface FolderUpdate {
  name: string
}

// Dialog
export interface Dialog {
  id: number
  account_id: number
  entity_type: DialogType
  username?: string
  name?: string
}

export interface DialogCreate {
  id: number
  account_id: number
  entity_type: DialogType
  username?: string
  name?: string
}

export interface DialogUpdate {
  username?: string
  name?: string
}

// Message
export interface Message {
  id: number
  dialog_id: number
  account_id: number
  from_id?: number
  from_type?: PeerType
  text?: string
  date?: string
}

export interface MessageCreate {
  id: number
  dialog_id: number
  account_id: number
  from_id?: number
  from_type?: PeerType
  text?: string
  date?: string
}

export interface MessageUpdate {
  text?: string
}

// Vacancy Review
export interface VacancyReview {
  id: number
  message_id: number
  dialog_id: number
  account_id: number
  decision: VacancyReviewDecision
  contacts: ContactDTO[]
  vacancy_position: string
  vacancy_description: string
  vacancy_requirements?: string
  salary_fork_from?: number
  salary_fork_to?: number
}

export interface VacancyReviewCreate {
  message_id: number
  dialog_id: number
  account_id: number
  decision: VacancyReviewDecision
  contacts: ContactDTO[]
  vacancy_position: string
  vacancy_description: string
  vacancy_requirements?: string
  salary_fork_from?: number
  salary_fork_to?: number
}

export interface VacancyReviewUpdate {
  decision?: VacancyReviewDecision
  contacts?: ContactDTO[]
  vacancy_position?: string
  vacancy_description?: string
  vacancy_requirements?: string
  salary_fork_from?: number
  salary_fork_to?: number
}

// Vacancy Progress
export interface VacancyProgress {
  id: number
  review_id: number
  status: VacancyProgressStatus
  comment?: string
}

export interface VacancyProgressCreate {
  review_id: number
  status?: VacancyProgressStatus
  comment?: string
}

export interface VacancyProgressUpdate {
  status?: VacancyProgressStatus
  comment?: string
}

// Telegram Operations
export interface TelegramFetchRequest {
  account_id: number
  new_only?: boolean
  date_from?: string
  date_to?: string
  max_messages?: number
  folder_id?: number
  dry_run?: boolean
}

export interface TelegramFetchChatsRequest {
  account_id: number
  folder_id?: number
  dry_run?: boolean
}

export interface TelegramFetchMessagesRequest {
  account_id: number
  chat_id: number
  new_only?: boolean
  date_from?: string
  date_to?: string
  max_messages?: number
  dry_run?: boolean
}

export interface TelegramFolderAddRemoveRequest {
  account_id: number
  folder_id: number
  chat_id: number
}

export interface TelegramFolderBulkAddRemoveRequest {
  account_id: number
  folder_id: number
  chat_ids: number[]
}

export interface TelegramFolderCreateRequest {
  account_id: number
  title: string
  chat_id?: number
}

export interface TelegramFolderRenameRequest {
  account_id: number
  folder_id: number
  title: string
}

export interface TelegramFolder {
  id: number
  title: string
  chat_ids: number[]
}

// Agent
export interface AgentReviewRequest {
  prompt_id: number
  max_messages?: number
  unreviewed_only?: boolean
  account_id?: number
  chat_id?: number
  folder_id?: number
}

// API Error
export interface ApiError {
  status: number
  message: string
  details?: Record<string, string[]>
}
