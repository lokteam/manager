import os
from datetime import datetime, timedelta
from telethon import TelegramClient
import typer

from shared import models as db
from .converters import extract_dialog_type, extract_peer_type, extract_peer_id

api_id = int(os.getenv("API_ID", 0))
api_hash = os.getenv("API_HASH", "")

client: TelegramClient

app = typer.Typer(name="tgfetch")


@app.callback()
def callback():
  global client
  client = TelegramClient("al_addr", api_id, api_hash)
  db.init_db()


async def get_messages(
  dialog, new_only: bool, max_messages: int, offset_date: datetime
):
  if isinstance(dialog, int):
    dialogs = await client.get_dialogs()
    dialog = next(d for d in dialogs if d.id == dialog)

  typer.echo(f"Fetching messages from chat ID: {dialog.id}")

  if new_only and dialog.unread_count <= 0:
    return
  elif new_only:
    limit = min(max_messages, dialog.unread_count)
  else:
    limit = max_messages

  messages = await client.get_messages(dialog, offset_date=offset_date)
  kwargs = {
    "entity": dialog,
    "limit": limit,
  }

  if messages:
    kwargs["min_id"] = messages[0].id

  messages = await client.get_messages(**kwargs)

  typer.echo(f"Retrieved {len(messages)} messages")

  with db.get_session() as session:
    for message in messages:
      await message.mark_read()
      message_model = db.Message(
        id=message.id,
        dialog_id=dialog.id,
        from_id=extract_peer_id(message),
        from_type=extract_peer_type(message),
        text=message.message,
        date=message.date,
      )

      session.merge(message_model)

    session.commit()

  typer.echo(f"✓ Successfully saved {len(messages)} messages to database")
  return messages


@app.command()
def fetch(
  new_only: bool = typer.Option(True, help="Fetch only unread messages"),
  offset_date: datetime = typer.Option(
    datetime.now() - timedelta(1), help="Parse messages after this date, till now"
  ),
  max_messages: int = typer.Option(
    10000, help="Maximum messages per chat (None for all)"
  ),
):
  """Fetch all dialogs and messages from Telegram and save to database"""
  client.start()

  async def f_():
    dialogs = await client.get_dialogs()
    typer.echo(f"Found {len(dialogs)} dialogs")

    with db.get_session() as session:
      for dialog in dialogs:
        dialog_model = db.Dialog(
          id=dialog.id,
          name=dialog.name,
          username=dialog.entity.username,
          entity_type=extract_dialog_type(dialog),
          folder_id=dialog.folder_id,
        )

        session.merge(dialog_model)
      session.commit()

      for dialog in dialogs:
        await get_messages(dialog, new_only, max_messages, offset_date)

    typer.echo(f"✓ Successfully saved {len(dialogs)} chats to database")

  client.loop.run_until_complete(f_())


@app.command()
def fetch_chats():
  """Fetch all chats from Telegram and save to database"""
  client.start()

  async def f_():
    dialogs = await client.get_dialogs()
    typer.echo(f"Found {len(dialogs)} dialogs")

    with db.get_session() as session:
      for dialog in dialogs:
        dialog_model = db.Dialog(
          id=dialog.id,
          name=dialog.name,
          username=dialog.entity.username,
          entity_type=extract_dialog_type(dialog),
          folder_id=dialog.folder_id,
        )

        session.merge(dialog_model)
      session.commit()

    typer.echo(f"✓ Successfully saved {len(dialogs)} chats to database")

  client.loop.run_until_complete(f_())


@app.command()
def fetch_messages(
  chat_id: int = typer.Argument(..., help="Chat ID to parse messages from"),
  new_only: bool = typer.Option(True, help="Fetch only unread messages"),
  offset_date: datetime = typer.Option(
    datetime.now() - timedelta(1), help="Parse messages after this date, till now"
  ),
  max_messages: int = typer.Option(
    10000, help="Maximum messages to fetch (None for all)"
  ),
):
  """Parse messages from a specific chat by its ID and save to database"""
  client.start()
  client.loop.run_until_complete(
    get_messages(chat_id, new_only, max_messages, offset_date)
  )


if __name__ == "__main__":
  app()
