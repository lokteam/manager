import os
import contextlib
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, create_engine, Session
from typing import Optional, List, Generator
from enum import Enum

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


class DialogType(str, Enum):
    USER = "User"
    GROUP = "Group"
    CHANNEL = "Channel"


class PeerType(str, Enum):
    USER = "User"
    CHAT = "Chat"
    CHANNEL = "Channel"


class Dialog(SQLModel, table=True):
    id: int = Field(primary_key=True)
    entity_type: DialogType
    username: Optional[str] = None
    name: str
    folder_id: Optional[int] = None

    messages: List["Message"] = Relationship(back_populates="dialog")


class Message(SQLModel, table=True):
    id: int = Field(primary_key=True)
    dialog_id: int = Field(foreign_key="dialog.id")
    from_id: Optional[int] = None
    from_type: Optional[PeerType] = None
    text: Optional[str] = None
    date: Optional[datetime] = None

    dialog: Dialog = Relationship(back_populates="messages")
    review: "Review" = Relationship(back_populates="message")


class Review(SQLModel, table=True):
    id: int = Field(primary_key=True, default=None)
    message_id: int = Field(foreign_key="message.id")
    approved: bool
    text: str

    message: Message = Relationship(back_populates="review")
