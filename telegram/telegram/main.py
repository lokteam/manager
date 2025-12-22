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
  """Fetch all dialogs and messages from Telegram and save to database"""
  pass


def init_resources():
  global client
  session_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "sessions", "al_addr"
  )
  client = TelegramClient(session_path, api_id, api_hash)
  db.init_db()


async def get_messages(
  dialog,
  new_only: bool,
  max_messages: int | None,
  date_from: datetime | None,
  date_to: datetime | None,
  dry_run: bool = False,
):
  if isinstance(dialog, int):
    dialogs = await client.get_dialogs(limit=None)
    dialog = next(d for d in dialogs if d.id == dialog)

  typer.echo(f"Fetching messages from chat ID: {dialog.id}")

  kwargs = {
    "entity": dialog,
    "limit": max_messages,
  }

  if date_to:
    date_to += timedelta(seconds=1)
    msgs = await client.get_messages(dialog, limit=1, offset_date=date_to)
    if not msgs:
      typer.echo("No messages found before date_to.")
      return []
    kwargs["max_id"] = msgs[0].id + 1

  if date_from:
    date_from -= timedelta(seconds=1)
    msgs = await client.get_messages(dialog, limit=1, offset_date=date_from)
    if msgs:
      kwargs["min_id"] = msgs[0].id

  if new_only:
    if dialog.unread_count <= 0:
      typer.echo("No new messages.")
      return []
    unread_limit = dialog.unread_count
    if kwargs.get("limit"):
      kwargs["limit"] = min(kwargs["limit"], unread_limit)
    else:
      kwargs["limit"] = unread_limit

  typer.echo(kwargs)
  messages = []
  async for message in client.iter_messages(**kwargs):
    messages.append(message)

  typer.echo(f"Retrieved {len(messages)} messages")

  if dry_run:
    for message in messages:
      typer.echo(
        f"[{message.date}] {extract_peer_type(message)} {extract_peer_id(message)}: {message.message}"
      )
  else:
    if messages:
      with db.get_session() as session:
        for message in messages:
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

      await messages[0].mark_read()
      typer.echo(f"✓ Successfully saved {len(messages)} messages to database")

  return messages


async def sync_dialogs(dry_run: bool = False):
  dialogs = await client.get_dialogs(limit=None)
  typer.echo(f"Found {len(dialogs)} dialogs")

  if dry_run:
    for dialog in dialogs:
      typer.echo(f"Chat: {dialog.id} | {dialog.name} | {extract_dialog_type(dialog)}")
  else:
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

  return dialogs


async def run_fetch(
  new_only: bool,
  date_from: datetime | None,
  date_to: datetime | None,
  max_messages: int,
  dry_run: bool,
):
  dialogs = await sync_dialogs(dry_run=dry_run)
  for dialog in dialogs:
    await get_messages(
      dialog, new_only, max_messages, date_from, date_to, dry_run=dry_run
    )


def run_async(func, *args, **kwargs):
  """Initialize resources and run an async function in the client loop"""
  init_resources()
  client.start()
  try:
    return client.loop.run_until_complete(func(*args, **kwargs))
  finally:
    client.disconnect()


@app.command()
def fetch(
  new_only: bool = typer.Option(True, help="Fetch only unread messages"),
  date_from: datetime | None = typer.Option(
    None, help="Parse messages after this date"
  ),
  date_to: datetime | None = typer.Option(None, help="Parse messages before this date"),
  max_messages: int = typer.Option(
    1000, help="Maximum messages per chat"
  ),
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Fetch all dialogs and messages from Telegram and save to database"""
  if date_from is None and not new_only:
    date_from = datetime.now() - timedelta(1)

  run_async(run_fetch, new_only, date_from, date_to, max_messages, dry_run)


@app.command()
def fetch_chats(
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Fetch all chats from Telegram and save to database"""
  run_async(sync_dialogs, dry_run=dry_run)


@app.command()
def fetch_messages(
  chat_id: int = typer.Argument(..., help="Chat ID to parse messages from"),
  new_only: bool = typer.Option(True, help="Fetch only unread messages"),
  date_from: datetime | None = typer.Option(
    None, help="Parse messages after this date"
  ),
  date_to: datetime | None = typer.Option(None, help="Parse messages before this date"),
  max_messages: int = typer.Option(
    1000, help="Maximum messages to fetch"
  ),
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Parse messages from a specific chat by its ID and save to database"""
  run_async(get_messages, chat_id, new_only, max_messages, date_from, date_to, dry_run)


if __name__ == "__main__":
  app()
