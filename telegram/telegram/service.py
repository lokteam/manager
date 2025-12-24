from datetime import datetime, timedelta
from telethon import functions, types
from shared import models as db
from .converters import extract_dialog_type, extract_peer_type, extract_peer_id


async def get_messages(
  client,
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

  kwargs = {
    "entity": dialog,
    "limit": max_messages,
  }

  if date_to:
    date_to += timedelta(seconds=1)
    msgs = await client.get_messages(dialog, limit=1, offset_date=date_to)
    if not msgs:
      return []
    kwargs["max_id"] = msgs[0].id + 1

  if date_from:
    date_from -= timedelta(seconds=1)
    msgs = await client.get_messages(dialog, limit=1, offset_date=date_from)
    if msgs:
      kwargs["min_id"] = msgs[0].id

  if new_only:
    if dialog.unread_count <= 0:
      return []
    unread_limit = dialog.unread_count
    if kwargs.get("limit"):
      kwargs["limit"] = min(kwargs["limit"], unread_limit)
    else:
      kwargs["limit"] = unread_limit

  messages = []
  async for message in client.iter_messages(**kwargs):
    messages.append(message)

  if not dry_run and messages:
    account_id = getattr(client, "account_id", None)
    with db.session_context() as session:
      for message in messages:
        message_model = db.Message(
          id=message.id,
          dialog_id=dialog.id,
          account_id=account_id,
          from_id=extract_peer_id(message),
          from_type=extract_peer_type(message),
          text=message.message,
          date=message.date,
        )
        session.merge(message_model)
      session.commit()
    await messages[0].mark_read()

  return messages


async def sync_dialogs(client, folder_id: int | None = None, dry_run: bool = False):
  """Fetch dialogs and save to local DB"""
  dialogs = await client.get_dialogs(limit=None)

  if folder_id is not None:
    # If folder_id is provided, we filter by that folder's peers
    filters_resp = await client(functions.messages.GetDialogFiltersRequest())
    target_filter = next(
      (f for f in filters_resp.filters if getattr(f, "id", None) == folder_id), None
    )
    if not target_filter:
      raise ValueError(f"Folder with ID {folder_id} not found.")

    included_peer_ids = []
    if hasattr(target_filter, "include_peers"):
      for peer in target_filter.include_peers:
        if isinstance(peer, types.InputPeerUser):
          included_peer_ids.append(peer.user_id)
        elif isinstance(peer, types.InputPeerChat):
          included_peer_ids.append(peer.chat_id)
        elif isinstance(peer, types.InputPeerChannel):
          included_peer_ids.append(int("-100" + str(peer.channel_id)))

    dialogs = [d for d in dialogs if d.id in included_peer_ids]

  if not dry_run:
    account_id = getattr(client, "account_id", None)
    if not account_id:
      return dialogs

    with db.session_context() as session:
      for dialog in dialogs:
        dialog_model = db.Dialog(
          id=dialog.id,
          account_id=account_id,
          name=dialog.name,
          username=dialog.entity.username
          if hasattr(dialog.entity, "username")
          else None,
          entity_type=extract_dialog_type(dialog),
        )
        session.merge(dialog_model)
      session.commit()

  return dialogs


async def get_folders(client):
  """Get Telegram dialog filters (folders) with their peer IDs"""
  filters_resp = await client(functions.messages.GetDialogFiltersRequest())
  results = []
  for f in filters_resp.filters:
    chat_ids = []
    if hasattr(f, "include_peers"):
      for peer in f.include_peers:
        if isinstance(peer, types.InputPeerUser):
          chat_ids.append(peer.user_id)
        elif isinstance(peer, types.InputPeerChat):
          chat_ids.append(peer.chat_id)
        elif isinstance(peer, types.InputPeerChannel):
          chat_ids.append(int("-100" + str(peer.channel_id)))

    if isinstance(f, types.DialogFilter):
      results.append({"id": f.id, "title": f.title.text, "chat_ids": chat_ids})
    elif isinstance(f, types.DialogFilterDefault):
      results.append({"id": 0, "title": "All Chats", "chat_ids": []})
  return results


async def update_folder_chat(
  client, folder_id: int, chat_id: int, remove: bool = False
):
  filters_resp = await client(functions.messages.GetDialogFiltersRequest())
  target_filter = next(
    (f for f in filters_resp.filters if getattr(f, "id", None) == folder_id), None
  )

  if not target_filter or not isinstance(target_filter, types.DialogFilter):
    raise ValueError(f"Folder with ID {folder_id} not found.")

  input_peer = await client.get_input_entity(chat_id)
  current_peers = list(target_filter.include_peers)

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
    else:
      return False
  else:
    if peer_index == -1:
      current_peers.append(input_peer)
    else:
      return False

  target_filter.include_peers = current_peers
  await client(
    functions.messages.UpdateDialogFilterRequest(id=folder_id, filter=target_filter)
  )
  return True


async def create_folder(client, title: str, chat_id: int | None = None):
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
  return new_id


async def delete_folder(client, folder_id: int):
  await client(functions.messages.UpdateDialogFilterRequest(id=folder_id, filter=None))
  return True


async def rename_folder(client, folder_id: int, new_title: str):
  filters_resp = await client(functions.messages.GetDialogFiltersRequest())
  target_filter = next(
    (f for f in filters_resp.filters if getattr(f, "id", None) == folder_id), None
  )

  if not target_filter or not isinstance(target_filter, types.DialogFilter):
    raise ValueError(f"Folder with ID {folder_id} not found.")

  target_filter.title = types.TextWithEntities(text=new_title, entities=[])
  await client(
    functions.messages.UpdateDialogFilterRequest(id=folder_id, filter=target_filter)
  )
  return True
