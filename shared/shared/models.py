import os
import contextlib
from enum import Enum
from datetime import datetime
from typing import Annotated, Generator

from sqlmodel import SQLModel, Field, Relationship, create_engine, Session, Column
from sqlalchemy.dialects.postgresql import JSONB


# Database configuration
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")
DB_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DB_URL)


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


class DialogType(str, Enum):
  USER = "User"
  GROUP = "Group"
  CHANNEL = "Channel"


class Dialog(SQLModel, table=True):
  id: int = Field(primary_key=True)
  entity_type: DialogType
  username: str = None
  name: str = None
  folder_id: int = None

  messages: list["Message"] = Relationship(back_populates="dialog")


class PeerType(str, Enum):
  USER = "User"
  CHAT = "Chat"
  CHANNEL = "Channel"


class Message(SQLModel, table=True):
  id: int = Field(primary_key=True)
  dialog_id: int = Field(foreign_key="dialog.id")
  from_id: int = None
  from_type: PeerType = None
  text: str = None
  date: datetime = None

  dialog: Dialog = Relationship(back_populates="messages")
  review: "VacancyReview" = Relationship(back_populates="message")


class ContactType(EnumCat):
  PHONE = "Mobile phone number"
  EMAIL = "Email address"
  TELEGRAM_USERNAME = "Username in telegram (usually starts with @)"
  EXTERNAL_PLATFORM = "Link to vacancy on head hunting platform"
  OTHER = "All others"


class VacancyReviewDecision(EnumCat):
  DISMISS = "Message is unrelated"
  APPROVE = "Message is related"


class VacancyReview(SQLModel, table=True):
  type Contacts = list[list[ContactType, Annotated[str, "Contact value"]]]

  id: int = Field(primary_key=True, default=None)
  message_id: int = Field(foreign_key="message.id", unique=True)
  decision: VacancyReviewDecision
  contacts: Contacts = Field(sa_column=Column(JSONB), default_factory=list)
  vacancy_position: str
  vacancy_description: str
  vacancy_requirements: str | None
  salary_fork_from: int | None
  salary_fork_to: int | None

  message: Message = Relationship(back_populates="review")
  vacancy: "VacancyProgress" = Relationship(back_populates="review")


class VacancyProgressStatus(EnumCat):
  NEW = "New, untouched vacancy"
  CONTACT = "I am chatting with HR's"
  IGNORE = "I was ignored by HR or was early rejected without interview"
  INTERVIEW = "I am waiting for the job interview"
  REJECT = "I was rejected"
  OFFER = "I was given an offer"


class VacancyProgress(SQLModel, table=True):
  id: int = Field(primary_key=True, default=None)
  review_id: int = Field(foreign_key="vacancyreview.id", unique=True)
  status: VacancyProgressStatus = Field(default=VacancyProgressStatus.NEW)
  comment: str | None

  review: VacancyReview = Relationship(back_populates="vacancy")
