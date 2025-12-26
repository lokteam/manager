from pydantic import BaseModel, ConfigDict
from shared.models import (
  DialogType,
  PeerType,
  ContactDTO,
  Seniority,
  VacancyReviewDecision,
  VacancyProgressStatus,
)
from datetime import datetime


class SchemaBase(BaseModel):
  model_config = ConfigDict(from_attributes=True)


# TelegramAccount
class TelegramAccountCreate(SchemaBase):
  api_id: int
  api_hash: str
  phone: str


class TelegramAccountConfirm(SchemaBase):
  phone: str
  code: str


class TelegramAccountUpdate(SchemaBase):
  name: str | None = None
  username: str | None = None


class TelegramAccountRead(SchemaBase):
  id: int
  user_id: int
  api_id: int
  api_hash: str
  phone: str
  name: str | None = None
  username: str | None = None


# Prompt
class PromptCreate(SchemaBase):
  name: str
  description: str | None = None
  content: str


class PromptUpdate(SchemaBase):
  name: str | None = None
  description: str | None = None
  content: str | None = None


class PromptRead(PromptCreate):
  id: int
  user_id: int


# Folder
class FolderCreate(SchemaBase):
  name: str


class FolderUpdate(SchemaBase):
  name: str


class FolderRead(FolderCreate):
  id: int
  user_id: int


# Dialog
class DialogCreate(SchemaBase):
  telegram_id: int
  account_id: int
  entity_type: DialogType
  username: str | None = None
  name: str | None = None


class DialogUpdate(SchemaBase):
  username: str | None = None
  name: str | None = None


class DialogRead(DialogCreate):
  id: int


# Message
class MessageCreate(SchemaBase):
  telegram_id: int
  dialog_id: int
  from_id: int | None = None
  from_type: PeerType | None = None
  text: str | None = None
  date: datetime | None = None


class MessageUpdate(SchemaBase):
  text: str | None = None


class MessageRead(MessageCreate):
  id: int


# VacancyReview
class VacancyReviewCreate(SchemaBase):
  message_id: int
  decision: VacancyReviewDecision
  seniority: Seniority | None = None
  contacts: list[ContactDTO] = []
  vacancy_position: str
  vacancy_description: str
  vacancy_requirements: list[str] | None = None
  salary_fork_from: int | None = None
  salary_fork_to: int | None = None


class VacancyReviewUpdate(SchemaBase):
  decision: VacancyReviewDecision | None = None
  seniority: Seniority | None = None
  contacts: list[ContactDTO] | None = None
  vacancy_position: str | None = None
  vacancy_description: str | None = None
  vacancy_requirements: list[str] | None = None
  salary_fork_from: int | None = None
  salary_fork_to: int | None = None


class VacancyReviewRead(VacancyReviewCreate):
  id: int
  dialog_id: int
  account_id: int
  telegram_dialog_id: int
  telegram_message_id: int
  dialog_username: str | None = None


# VacancyProgress
class VacancyProgressCreate(SchemaBase):
  review_id: int
  status: VacancyProgressStatus = VacancyProgressStatus.NEW
  comment: str | None = None


class VacancyProgressUpdate(SchemaBase):
  status: VacancyProgressStatus | None = None
  comment: str | None = None


class VacancyProgressRead(VacancyProgressCreate):
  id: int


class VacancyProgressReadWithReview(VacancyProgressRead):
  review: VacancyReviewRead


# CLI-like Command Schemas


class TelegramFetchRequest(SchemaBase):
  account_id: int
  new_only: bool = True
  date_from: datetime | None = None
  date_to: datetime | None = None
  max_messages: int = 1000
  folder_id: int | None = None
  dry_run: bool = False


class TelegramFetchChatsRequest(SchemaBase):
  account_id: int
  folder_id: int | None = None
  dry_run: bool = False


class TelegramFetchMessagesRequest(SchemaBase):
  account_id: int
  chat_id: int
  new_only: bool = True
  date_from: datetime | None = None
  date_to: datetime | None = None
  max_messages: int = 1000
  dry_run: bool = False


class TelegramFolderAddRemoveRequest(SchemaBase):
  account_id: int
  folder_id: int
  chat_id: int


class TelegramFolderBulkAddRemoveRequest(SchemaBase):
  account_id: int
  folder_id: int
  chat_ids: list[int]


class TelegramFolderCreateRequest(SchemaBase):
  account_id: int
  title: str
  chat_id: int | None = None


class TelegramFolderRenameRequest(SchemaBase):
  account_id: int
  folder_id: int
  title: str


class AgentReviewRequest(SchemaBase):
  prompt_id: int
  max_messages: int | None = None
  unreviewed_only: bool = True
  account_id: int | None = None
  chat_id: int | None = None
  folder_id: int | None = None
