from pydantic import BaseModel
from shared.models import (
  DialogType,
  PeerType,
  ContactDTO,
  VacancyReviewDecision,
  VacancyProgressStatus,
)
from datetime import datetime


class TelegramAccountCreate(BaseModel):
  id: int
  user_id: int
  api_id: int
  api_hash: str
  phone: str
  name: str | None = None
  username: str | None = None


class TelegramAccountUpdate(BaseModel):
  name: str | None = None
  username: str | None = None


class FolderCreate(BaseModel):
  name: str
  user_id: int


class FolderUpdate(BaseModel):
  name: str


class DialogCreate(BaseModel):
  id: int
  account_id: int
  entity_type: DialogType
  username: str | None = None
  name: str | None = None


class DialogUpdate(BaseModel):
  username: str | None = None
  name: str | None = None


class MessageCreate(BaseModel):
  id: int
  dialog_id: int
  account_id: int
  from_id: int | None = None
  from_type: PeerType | None = None
  text: str | None = None
  date: datetime | None = None


class MessageUpdate(BaseModel):
  text: str | None = None


class VacancyReviewCreate(BaseModel):
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


class VacancyReviewUpdate(BaseModel):
  decision: VacancyReviewDecision | None = None
  contacts: list[ContactDTO] | None = None
  vacancy_position: str | None = None
  vacancy_description: str | None = None


class VacancyProgressCreate(BaseModel):
  review_id: int
  status: VacancyProgressStatus = VacancyProgressStatus.NEW
  comment: str | None = None


class VacancyProgressUpdate(BaseModel):
  status: VacancyProgressStatus | None = None
  comment: str | None = None
