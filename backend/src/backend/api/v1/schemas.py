from pydantic import BaseModel, ConfigDict
from shared.models import (
  DialogType,
  PeerType,
  ContactDTO,
  VacancyReviewDecision,
  VacancyProgressStatus,
)
from datetime import datetime


class SchemaBase(BaseModel):
  model_config = ConfigDict(from_attributes=True)


# TelegramAccount
class TelegramAccountCreate(SchemaBase):
  id: int
  api_id: int
  api_hash: str
  phone: str
  name: str | None = None
  username: str | None = None


class TelegramAccountUpdate(SchemaBase):
  name: str | None = None
  username: str | None = None


class TelegramAccountRead(TelegramAccountCreate):
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
  id: int
  account_id: int
  entity_type: DialogType
  username: str | None = None
  name: str | None = None


class DialogUpdate(SchemaBase):
  username: str | None = None
  name: str | None = None


class DialogRead(DialogCreate):
  pass


# Message
class MessageCreate(SchemaBase):
  id: int
  dialog_id: int
  account_id: int
  from_id: int | None = None
  from_type: PeerType | None = None
  text: str | None = None
  date: datetime | None = None


class MessageUpdate(SchemaBase):
  text: str | None = None


class MessageRead(MessageCreate):
  pass


# VacancyReview
class VacancyReviewCreate(SchemaBase):
  message_id: int
  dialog_id: int
  account_id: int
  decision: VacancyReviewDecision
  contacts: list[ContactDTO] = []
  vacancy_position: str
  vacancy_description: str
  vacancy_requirements: str | None = None
  salary_fork_from: int | None = None
  salary_fork_to: int | None = None


class VacancyReviewUpdate(SchemaBase):
  decision: VacancyReviewDecision | None = None
  contacts: list[ContactDTO] | None = None
  vacancy_position: str | None = None
  vacancy_description: str | None = None
  vacancy_requirements: str | None = None
  salary_fork_from: int | None = None
  salary_fork_to: int | None = None


class VacancyReviewRead(VacancyReviewCreate):
  id: int


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
