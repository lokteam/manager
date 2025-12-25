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
    chat_ids = set()
    for attr in ["include_peers", "pinned_peers"]:
      if hasattr(f, attr):
        for peer in getattr(f, attr):
          pid = get_peer_id(peer)
          if pid:
            chat_ids.add(pid)

    if isinstance(f, types.DialogFilter):
      results.append({"id": f.id, "title": f.title.text, "chat_ids": list(chat_ids)})
    elif isinstance(f, types.DialogFilterDefault):
      results.append({"id": 0, "title": "All Chats", "chat_ids": []})
  return results


def get_peer_id(peer: types.TypeInputPeer | types.TypePeer) -> int:
  """Extract numeric ID from various Telegram peer types, matching Telethon's dialog.id convention."""
  if hasattr(peer, "user_id"):
    return getattr(peer, "user_id")
  if hasattr(peer, "chat_id"):
    # Legacy Chats have negative IDs in Telethon dialogs
    cid = getattr(peer, "chat_id")
    return -cid if cid > 0 else cid
  if hasattr(peer, "channel_id"):
    cid = getattr(peer, "channel_id")
    # Channels have -100 prefix in Telethon dialogs
    if cid > 0:
      return int("-100" + str(cid))
    return cid
  return 0


async def update_folder_chats(
  client, folder_id: int, chat_ids: list[int], remove: bool = False
):
  filters_resp = await client(functions.messages.GetDialogFiltersRequest())
  target_filter = next(
    (f for f in filters_resp.filters if getattr(f, "id", None) == folder_id), None
  )

  if not target_filter or not isinstance(target_filter, types.DialogFilter):
    raise ValueError(f"Folder with ID {folder_id} not found.")

  current_peers = list(target_filter.include_peers)
  current_pinned = list(getattr(target_filter, "pinned_peers", []))
  changed = False

  # Pre-fetch entities to populate cache for ADDING
  if not remove and chat_ids:
    try:
      await client.get_entity(chat_ids)
    except Exception:
      pass

  for chat_id in chat_ids:
    # Find in included peers
    peer_index = -1
    for i, p in enumerate(current_peers):
      if get_peer_id(p) == chat_id:
        peer_index = i
        break

    # Find in pinned peers
    pinned_index = -1
    for i, p in enumerate(current_pinned):
      if get_peer_id(p) == chat_id:
        pinned_index = i
        break

    if remove:
      peer_removed = False
      if peer_index != -1:
        current_peers.pop(peer_index)
        peer_removed = True
      if pinned_index != -1:
        current_pinned.pop(pinned_index)
        peer_removed = True

      # If we are removing, we should also add to exclude_peers to handle
      # cases where the chat is included via flags (e.g. "bots", "contacts")
      try:
        input_peer = await client.get_input_entity(chat_id)
        current_excluded = list(getattr(target_filter, "exclude_peers", []))
        if not any(get_peer_id(p) == chat_id for p in current_excluded):
          current_excluded.append(input_peer)
          target_filter.exclude_peers = current_excluded
          changed = True
      except Exception:
        # If we can't get the entity, we can't exclude it properly,
        # but if we already removed it from current_peers, we still want to save
        pass

      if peer_removed:
        changed = True
    else:
      if peer_index == -1:
        try:
          input_peer = await client.get_input_entity(chat_id)
          current_peers.append(input_peer)
          # Also remove from excluded if present
          if hasattr(target_filter, "exclude_peers"):
            target_filter.exclude_peers = [
              p for p in target_filter.exclude_peers if get_peer_id(p) != chat_id
            ]
          changed = True
        except Exception:
          continue

  if changed:
    target_filter.include_peers = current_peers
    target_filter.pinned_peers = current_pinned
    await client(
      functions.messages.UpdateDialogFilterRequest(id=folder_id, filter=target_filter)
    )
  return True


async def update_folder_chat(
  client, folder_id: int, chat_id: int, remove: bool = False
):
  return await update_folder_chats(client, folder_id, [chat_id], remove)


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
