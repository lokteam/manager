import typer
from datetime import datetime
from telethon import types
from telegram.telegram import service
from telegram.telegram.client import run_async

app = typer.Typer(name="telegram")


@app.command()
def fetch(
  new_only: bool = typer.Option(True, help="Fetch only unread messages"),
  date_from: datetime | None = typer.Option(
    None, help="Parse messages after this date"
  ),
  date_to: datetime | None = typer.Option(None, help="Parse messages before this date"),
  max_messages: int = typer.Option(1000, help="Maximum messages per chat"),
  folder_id: int | None = typer.Option(None, help="Folder ID to sync"),
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Fetch all dialogs and messages from Telegram and save to database"""

  async def run():
    dialogs = await service.sync_dialogs(folder_id=folder_id, dry_run=dry_run)
    for dialog in dialogs:
      typer.echo(f"Processing chat: {dialog.name} (ID: {dialog.id})")
      messages = await service.get_messages(
        dialog, new_only, max_messages, date_from, date_to, dry_run=dry_run
      )
      if messages:
        typer.echo(f"  ✓ Found {len(messages)} messages")
        if dry_run:
          for msg in messages:
            text = (msg.message or "").replace("\n", " ")
            typer.echo(f"    [{msg.date}] {msg.id}: {text[:100]}")
      else:
        typer.echo("  No new messages")

  run_async(run)


@app.command()
def fetch_chats(
  folder_id: int | None = typer.Option(None, help="Folder ID to sync"),
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Fetch all chats from Telegram and save to database"""

  async def run():
    dialogs = await service.sync_dialogs(folder_id=folder_id, dry_run=dry_run)
    for d in dialogs:
      typer.echo(f"Chat: {d.name} (ID: {d.id})")

  run_async(run)


@app.command()
def fetch_messages(
  chat_id: int = typer.Argument(..., help="Chat ID to parse messages from"),
  new_only: bool = typer.Option(True, help="Fetch only unread messages"),
  date_from: datetime | None = typer.Option(
    None, help="Parse messages after this date"
  ),
  date_to: datetime | None = typer.Option(None, help="Parse messages before this date"),
  max_messages: int = typer.Option(1000, help="Maximum messages to fetch"),
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Parse messages from a specific chat by its ID and save to database"""

  async def run():
    messages = await service.get_messages(
      chat_id, new_only, max_messages, date_from, date_to, dry_run
    )
    for msg in messages:
      text = (msg.message or "").replace("\n", " ")
      typer.echo(f"[{msg.date}] {msg.id}: {text[:50]}...")

  run_async(run)


@app.command()
def folders():
  """List all dialog folders (Dialog Filters)"""

  async def run():
    filters = await service.get_folders()
    for f in filters:
      if isinstance(f, types.DialogFilter):
        typer.echo(f"ID: {f.id} | Title: {f.title.text}")
      elif isinstance(f, types.DialogFilterDefault):
        typer.echo("ID: 0 | Title: All Chats")

  run_async(run)


@app.command()
def folder_add(
  folder_id: int = typer.Argument(..., help="Folder ID"),
  chat_id: int = typer.Argument(..., help="Chat ID to add"),
):
  """Add a chat to a specific folder"""
  if run_async(service.update_folder_chat, folder_id, chat_id, remove=False):
    typer.echo("✓ Folder updated successfully")
  else:
    typer.echo("Chat already in folder or error occurred")


@app.command()
def folder_remove(
  folder_id: int = typer.Argument(..., help="Folder ID"),
  chat_id: int = typer.Argument(..., help="Chat ID to remove"),
):
  """Remove a chat from a specific folder"""
  if run_async(service.update_folder_chat, folder_id, chat_id, remove=True):
    typer.echo("✓ Folder updated successfully")
  else:
    typer.echo("Chat not in folder or error occurred")


@app.command()
def folder_create(
  title: str = typer.Argument(..., help="Folder title"),
  chat_id: int | None = typer.Option(
    None, help="Initial chat ID (defaults to yourself)"
  ),
):
  """Create a new dialog folder"""
  new_id = run_async(service.create_folder, title, chat_id)
  typer.echo(f"✓ Folder '{title}' created with ID {new_id}")


@app.command()
def folder_delete(
  folder_id: int = typer.Argument(..., help="Folder ID to delete"),
):
  """Delete a dialog folder (does NOT delete chats within it)"""
  run_async(service.delete_folder, folder_id)
  typer.echo(f"✓ Folder with ID {folder_id} deleted successfully")
