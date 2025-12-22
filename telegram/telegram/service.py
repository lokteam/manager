from datetime import datetime, timedelta
from telethon import functions, types
from shared import models as db
from .converters import extract_dialog_type, extract_peer_type, extract_peer_id
from .client import get_client


async def get_messages(
  dialog,
  new_only: bool,
  max_messages: int | None,
  date_from: datetime | None,
  date_to: datetime | None,
  dry_run: bool = False,
):
  client = get_client()
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

  return messages


async def sync_dialogs(folder_id: int | None = None, dry_run: bool = False):
  client = get_client()
  filters_resp = await client(functions.messages.GetDialogFiltersRequest())
  all_filters = {
    f.id: f for f in filters_resp.filters if isinstance(f, types.DialogFilter)
  }

  included_peer_ids = []
  target_filter = None
  if folder_id is not None:
    target_filter = all_filters.get(folder_id)
    if not target_filter:
      raise ValueError(f"Folder with ID {folder_id} not found.")

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

  if not dry_run:
    with db.get_session() as session:
      for f_id, f_obj in all_filters.items():
        folder_model = db.Folder(id=f_id, name=f_obj.title.text)
        session.merge(folder_model)
      session.commit()

      peer_to_folders: dict[int, list[int]] = {}
      for f_id, f_obj in all_filters.items():
        for peer in f_obj.include_peers:
          p_id = None
          if isinstance(peer, types.InputPeerUser):
            p_id = peer.user_id
          elif isinstance(peer, types.InputPeerChat):
            p_id = peer.chat_id
          elif isinstance(peer, types.InputPeerChannel):
            p_id = int("-100" + str(peer.channel_id))
          if p_id:
            if p_id not in peer_to_folders:
              peer_to_folders[p_id] = []
            peer_to_folders[p_id].append(f_id)

      for dialog in dialogs:
        dialog_model = db.Dialog(
          id=dialog.id,
          name=dialog.name,
          username=dialog.entity.username
          if hasattr(dialog.entity, "username")
          else None,
          entity_type=extract_dialog_type(dialog),
        )
        db_dialog = session.merge(dialog_model)
        target_f_ids = peer_to_folders.get(dialog.id, [])
        for t_f_id in target_f_ids:
          f_model = session.get(db.Folder, t_f_id)
          if f_model and f_model not in db_dialog.folders:
            db_dialog.folders.append(f_model)
      session.commit()

  return dialogs


async def get_folders():
  client = get_client()
  filters = await client(functions.messages.GetDialogFiltersRequest())
  return filters.filters


async def update_folder_chat(folder_id: int, chat_id: int, remove: bool = False):
  client = get_client()
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


async def create_folder(title: str, chat_id: int | None = None):
  client = get_client()
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


async def delete_folder(folder_id: int):
  client = get_client()
  await client(functions.messages.UpdateDialogFilterRequest(id=folder_id, filter=None))
  return True
