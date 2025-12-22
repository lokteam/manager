import os
from datetime import datetime, timedelta
from telethon import TelegramClient, functions, types
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


async def sync_dialogs(folder_id: int | None = None, dry_run: bool = False):
  included_peer_ids = []
  if folder_id is not None:
    filters_resp = await client(functions.messages.GetDialogFiltersRequest())
    target_filter = next(
      (f for f in filters_resp.filters if getattr(f, "id", None) == folder_id), None
    )

    if not target_filter or not isinstance(target_filter, types.DialogFilter):
      typer.echo(f"Error: Folder with ID {folder_id} not found.")
      return []

    for peer in target_filter.include_peers:
      if isinstance(peer, types.InputPeerUser):
        included_peer_ids.append(peer.user_id)
      elif isinstance(peer, types.InputPeerChat):
        included_peer_ids.append(peer.chat_id)
      elif isinstance(peer, types.InputPeerChannel):
        included_peer_ids.append(int("-100" + str(peer.channel_id)))

  dialogs = await client.get_dialogs(limit=None)

  if folder_id is not None:
    dialogs = [d for d in dialogs if d.id in included_peer_ids]
    typer.echo(f"Found {len(dialogs)} dialogs in folder ID {folder_id}")
  else:
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
          username=dialog.entity.username
          if hasattr(dialog.entity, "username")
          else None,
          entity_type=extract_dialog_type(dialog),
          folder_id=folder_id if folder_id is not None else dialog.folder_id,
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
  folder_id: int | None = None,
):
  dialogs = await sync_dialogs(folder_id=folder_id, dry_run=dry_run)
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
  max_messages: int = typer.Option(1000, help="Maximum messages per chat"),
  folder_id: int | None = typer.Option(None, help="Folder ID to sync"),
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Fetch all dialogs and messages from Telegram and save to database"""
  if date_from is None and not new_only:
    date_from = datetime.now() - timedelta(1)

  run_async(run_fetch, new_only, date_from, date_to, max_messages, dry_run, folder_id)


@app.command()
def fetch_chats(
  folder_id: int | None = typer.Option(None, help="Folder ID to sync"),
  dry_run: bool = typer.Option(False, "--dry-run", help="Dry run mode"),
):
  """Fetch all chats from Telegram and save to database"""
  run_async(sync_dialogs, folder_id=folder_id, dry_run=dry_run)


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
  run_async(get_messages, chat_id, new_only, max_messages, date_from, date_to, dry_run)


async def folder_list_async():
  filters = await client(functions.messages.GetDialogFiltersRequest())
  for f in filters.filters:
    if isinstance(f, types.DialogFilter):
      typer.echo(f"ID: {f.id} | Title: {f.title.text}")
    elif isinstance(f, types.DialogFilterDefault):
      typer.echo("ID: 0 | Title: All Chats")


@app.command()
def folders():
  """List all dialog folders (Dialog Filters)"""
  run_async(folder_list_async)


async def folder_update_async(folder_id: int, chat_id: int, remove: bool = False):
  filters_resp = await client(functions.messages.GetDialogFiltersRequest())
  target_filter = next(
    (f for f in filters_resp.filters if getattr(f, "id", None) == folder_id), None
  )

  if not target_filter or not isinstance(target_filter, types.DialogFilter):
    typer.echo(f"Error: Folder with ID {folder_id} not found.")
    return

  input_peer = await client.get_input_entity(chat_id)
  current_peers = list(target_filter.include_peers)

  # Check if already in folder
  peer_index = -1
  for i, p in enumerate(current_peers):
    if (
      (
        isinstance(p, types.InputPeerUser)
        and isinstance(input_peer, types.InputPeerUser)
        and p.user_id == input_peer.user_id
      )
      or (
        isinstance(p, types.InputPeerChat)
        and isinstance(input_peer, types.InputPeerChat)
        and p.chat_id == input_peer.chat_id
      )
      or (
        isinstance(p, types.InputPeerChannel)
        and isinstance(input_peer, types.InputPeerChannel)
        and p.channel_id == input_peer.channel_id
      )
    ):
      peer_index = i
      break

  if remove:
    if peer_index != -1:
      current_peers.pop(peer_index)
      typer.echo(f"Removing chat {chat_id} from folder {folder_id}")
    else:
      typer.echo(f"Chat {chat_id} is not in folder {folder_id}")
      return
  else:
    if peer_index == -1:
      current_peers.append(input_peer)
      typer.echo(f"Adding chat {chat_id} to folder {folder_id}")
    else:
      typer.echo(f"Chat {chat_id} is already in folder {folder_id}")
      return

  target_filter.include_peers = current_peers
  await client(
    functions.messages.UpdateDialogFilterRequest(id=folder_id, filter=target_filter)
  )
  typer.echo("✓ Folder updated successfully")


@app.command()
def folder_add(
  folder_id: int = typer.Argument(..., help="Folder ID"),
  chat_id: int = typer.Argument(..., help="Chat ID to add"),
):
  """Add a chat to a specific folder"""
  run_async(folder_update_async, folder_id, chat_id, remove=False)


@app.command()
def folder_remove(
  folder_id: int = typer.Argument(..., help="Folder ID"),
  chat_id: int = typer.Argument(..., help="Chat ID to remove"),
):
  """Remove a chat from a specific folder"""
  run_async(folder_update_async, folder_id, chat_id, remove=True)


async def folder_create_async(title: str, chat_id: int | None = None):
  if chat_id is None:
    me = await client.get_me()
    chat_id = me.id

  input_peer = await client.get_input_entity(chat_id)

  filters_resp = await client(functions.messages.GetDialogFiltersRequest())
  existing_ids = [f.id for f in filters_resp.filters if hasattr(f, "id")]
  new_id = max(existing_ids) + 1 if existing_ids else 2

  new_filter = types.DialogFilter(
    id=new_id,
    title=types.TextWithEntities(text=title, entities=[]),
    pinned_peers=[],
    include_peers=[input_peer],
    exclude_peers=[],
  )

  await client(
    functions.messages.UpdateDialogFilterRequest(id=new_id, filter=new_filter)
  )
  typer.echo(f"✓ Folder '{title}' created with ID {new_id}")


@app.command()
def folder_create(
  title: str = typer.Argument(..., help="Folder title"),
  chat_id: int | None = typer.Option(
    None, help="Initial chat ID (defaults to yourself)"
  ),
):
  """Create a new dialog folder"""
  run_async(folder_create_async, title, chat_id)


async def folder_delete_async(folder_id: int):
  # To delete a folder, we call UpdateDialogFilterRequest with the folder ID and filter=None
  await client(functions.messages.UpdateDialogFilterRequest(id=folder_id, filter=None))
  typer.echo(f"✓ Folder with ID {folder_id} deleted successfully")


@app.command()
def folder_delete(
  folder_id: int = typer.Argument(..., help="Folder ID to delete"),
):
  """Delete a dialog folder (does NOT delete chats within it)"""
  run_async(folder_delete_async, folder_id)


if __name__ == "__main__":
  app()
