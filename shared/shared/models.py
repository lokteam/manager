import os
import json
import contextlib
from enum import Enum
from datetime import datetime
from typing import Generator

from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship, create_engine, Session, Column
from sqlalchemy import JSON


# Database configuration
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")
DB_URL = f"sqlite:///{DB_PATH}"


def pydantic_encoder(obj):
  if hasattr(obj, "model_dump"):
    return obj.model_dump()
  if isinstance(obj, Enum):
    return obj.name
  raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


engine = create_engine(
  DB_URL,
  connect_args={"check_same_thread": False},
  json_serializer=lambda obj: json.dumps(obj, default=pydantic_encoder),
)


@contextlib.contextmanager
def get_session() -> Generator[Session, None, None]:
  with Session(engine) as session:
    yield session


def init_db():
  SQLModel.metadata.create_all(engine)


class EnumCat(str, Enum):
  @property
  def show(self):
    return f"{self.name}: {self.value}"

  @classmethod
  def _missing_(cls, value):
    if isinstance(value, str):
      for member in cls:
        if member.name == value:
          return member
    return super()._missing_(value)


class DialogType(str, Enum):
  USER = "User"
  GROUP = "Group"
  CHANNEL = "Channel"


class DialogFolderLink(SQLModel, table=True):
  dialog_id: int = Field(foreign_key="dialog.id", primary_key=True)
  folder_id: int = Field(foreign_key="folder.id", primary_key=True)


class Folder(SQLModel, table=True):
  id: int = Field(primary_key=True)
  name: str = Field(index=True)

  dialogs: list["Dialog"] = Relationship(
    back_populates="folders", link_model=DialogFolderLink
  )


class Dialog(SQLModel, table=True):
  id: int = Field(primary_key=True)
  entity_type: DialogType
  username: str | None = Field(default=None, index=True)
  name: str | None = Field(default=None, index=True)

  folders: list[Folder] = Relationship(
    back_populates="dialogs", link_model=DialogFolderLink
  )
  messages: list["Message"] = Relationship(back_populates="dialog")


class PeerType(str, Enum):
  USER = "User"
  CHAT = "Chat"
  CHANNEL = "Channel"


class Message(SQLModel, table=True):
  id: int = Field(primary_key=True)
  dialog_id: int = Field(foreign_key="dialog.id")
  from_id: int | None = None
  from_type: PeerType | None = None
  text: str | None = None
  date: datetime | None = None

  dialog: Dialog = Relationship(back_populates="messages")
  review: "VacancyReview" = Relationship(back_populates="message")


class ContactType(EnumCat):
  PHONE = "PHONE"
  EMAIL = "EMAIL"
  TELEGRAM_USERNAME = "TELEGRAM_USERNAME"
  EXTERNAL_PLATFORM = "EXTERNAL_PLATFORM"
  OTHER = "OTHER"


class VacancyReviewDecision(EnumCat):
  DISMISS = "DISMISS"
  APPROVE = "APPROVE"


class ContactDTO(BaseModel):
  type: ContactType = Field(description="Type of contact")
  value: str = Field(description="Contact value (email, phone, etc.)")


class VacancyReview(SQLModel, table=True):
  id: int | None = Field(primary_key=True, default=None)
  message_id: int = Field(foreign_key="message.id", unique=True)
  decision: VacancyReviewDecision
  contacts: list[ContactDTO] = Field(sa_column=Column(JSON), default_factory=list)
  vacancy_position: str
  vacancy_description: str
  vacancy_requirements: str | None = None
  salary_fork_from: int | None = None
  salary_fork_to: int | None = None

  message: Message = Relationship(back_populates="review")
  vacancy: "VacancyProgress" = Relationship(back_populates="review")


class VacancyProgressStatus(EnumCat):
  NEW = "NEW"
  CONTACT = "CONTACT"
  IGNORE = "IGNORE"
  INTERVIEW = "INTERVIEW"
  REJECT = "REJECT"
  OFFER = "OFFER"


class VacancyProgress(SQLModel, table=True):
  id: int | None = Field(primary_key=True, default=None)
  review_id: int = Field(foreign_key="vacancyreview.id", unique=True)
  status: VacancyProgressStatus = Field(default=VacancyProgressStatus.NEW)
  comment: str | None = None

  review: VacancyReview = Relationship(back_populates="vacancy")
