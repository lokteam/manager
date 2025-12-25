import os
import json
import contextlib
from enum import Enum
from datetime import datetime
from typing import Generator, AsyncGenerator

from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship, create_engine, Session, Column
from sqlalchemy import JSON, ForeignKeyConstraint
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker


# Database configuration
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")
DB_URL = f"sqlite:///{DB_PATH}"
ASYNC_DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"


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

async_engine = create_async_engine(
  ASYNC_DB_URL,
  connect_args={"check_same_thread": False},
  json_serializer=lambda obj: json.dumps(obj, default=pydantic_encoder),
)


def get_session() -> Generator[Session, None, None]:
  with Session(engine) as session:
    yield session


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
  async_session = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
  )
  async with async_session() as session:
    yield session


session_context = contextlib.contextmanager(get_session)


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


class UserRole(str, Enum):
  ADMIN = "ADMIN"
  USER = "USER"


class User(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  email: str = Field(unique=True, index=True)
  hashed_password: str | None = None
  role: UserRole = Field(default=UserRole.USER)
  is_active: bool = Field(default=True)
  full_name: str | None = None
  sso_provider: str | None = None
  sso_id: str | None = None

  accounts: list["TelegramAccount"] = Relationship(back_populates="user")
  folders: list["Folder"] = Relationship(back_populates="user")
  prompts: list["Prompt"] = Relationship(back_populates="user")


class TelegramAccount(SQLModel, table=True):
  id: int = Field(primary_key=True)
  user_id: int = Field(foreign_key="user.id")
  api_id: int
  api_hash: str
  phone: str
  name: str | None = None
  username: str | None = None
  session_string: str | None = None

  user: User = Relationship(back_populates="accounts")
  dialogs: list["Dialog"] = Relationship(back_populates="account")


class DialogFolderLink(SQLModel, table=True):
  dialog_id: int = Field(primary_key=True)
  account_id: int = Field(primary_key=True)
  folder_id: int = Field(foreign_key="folder.id", primary_key=True)

  __table_args__ = (
    ForeignKeyConstraint(
      ["dialog_id", "account_id"],
      ["dialog.id", "dialog.account_id"],
    ),
  )


class Folder(SQLModel, table=True):
  id: int | None = Field(primary_key=True, default=None)
  user_id: int = Field(foreign_key="user.id")
  name: str = Field(index=True)

  user: User = Relationship(back_populates="folders")
  dialogs: list["Dialog"] = Relationship(
    back_populates="folders", link_model=DialogFolderLink
  )


class Dialog(SQLModel, table=True):
  id: int = Field(primary_key=True)
  account_id: int = Field(foreign_key="telegramaccount.id", primary_key=True)
  entity_type: DialogType
  username: str | None = Field(default=None, index=True)
  name: str | None = Field(default=None, index=True)

  account: TelegramAccount = Relationship(back_populates="dialogs")
  folders: list[Folder] = Relationship(
    back_populates="dialogs", link_model=DialogFolderLink
  )
  messages: list["Message"] = Relationship(
    back_populates="dialog",
    sa_relationship_kwargs={
      "primaryjoin": "and_(Dialog.id==Message.dialog_id, Dialog.account_id==Message.account_id)",
      "viewonly": True,
    },
  )


class PeerType(str, Enum):
  USER = "User"
  CHAT = "Chat"
  CHANNEL = "Channel"


class Message(SQLModel, table=True):
  id: int = Field(primary_key=True)
  dialog_id: int = Field(primary_key=True)
  account_id: int = Field(primary_key=True)
  from_id: int | None = None
  from_type: PeerType | None = None
  text: str | None = None
  date: datetime | None = None

  __table_args__ = (
    ForeignKeyConstraint(
      ["dialog_id", "account_id"],
      ["dialog.id", "dialog.account_id"],
    ),
  )

  dialog: Dialog = Relationship(
    back_populates="messages",
    sa_relationship_kwargs={
      "primaryjoin": "and_(Message.dialog_id==Dialog.id, Message.account_id==Dialog.account_id)",
    },
  )
  review: "VacancyReview" = Relationship(
    back_populates="message",
    sa_relationship_kwargs={
      "primaryjoin": "and_(Message.id==VacancyReview.message_id, Message.dialog_id==VacancyReview.dialog_id, Message.account_id==VacancyReview.account_id)",
      "uselist": False,
    },
  )


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
  message_id: int = Field()
  dialog_id: int = Field()
  account_id: int = Field()
  decision: VacancyReviewDecision
  contacts: list[ContactDTO] = Field(sa_column=Column(JSON), default_factory=list)
  vacancy_position: str
  vacancy_description: str
  vacancy_requirements: str | None = None
  salary_fork_from: int | None = None
  salary_fork_to: int | None = None

  __table_args__ = (
    ForeignKeyConstraint(
      ["message_id", "dialog_id", "account_id"],
      ["message.id", "message.dialog_id", "message.account_id"],
    ),
  )

  message: Message = Relationship(
    back_populates="review",
    sa_relationship_kwargs={
      "primaryjoin": "and_(VacancyReview.message_id==Message.id, VacancyReview.dialog_id==Message.dialog_id, VacancyReview.account_id==Message.account_id)",
    },
  )
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


class Prompt(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  user_id: int = Field(foreign_key="user.id")
  name: str = Field(index=True)
  description: str | None = None
  content: str

  user: User = Relationship(back_populates="prompts")
