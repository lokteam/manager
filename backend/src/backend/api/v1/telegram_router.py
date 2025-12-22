from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from telegram import service
from telegram.client import get_client
from backend.auth.deps import get_current_user
from . import schemas

router = APIRouter(prefix="/telegram", tags=["Telegram"])


async def get_started_client():
  client = get_client()
  if not client.is_connected():
    await client.start()
  return client


@router.post("/fetch")
async def fetch(
  params: schemas.TelegramFetchRequest,
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  dialogs = await service.sync_dialogs(
    folder_id=params.folder_id, dry_run=params.dry_run
  )
  results = []
  for dialog in dialogs:
    messages = await service.get_messages(
      dialog,
      params.new_only,
      params.max_messages,
      params.date_from,
      params.date_to,
      dry_run=params.dry_run,
    )
    results.append(
      {"chat_name": dialog.name, "chat_id": dialog.id, "message_count": len(messages)}
    )
  return {"status": "success", "data": results}


@router.post("/fetch-chats")
async def fetch_chats(
  params: schemas.TelegramFetchChatsRequest,
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  dialogs = await service.sync_dialogs(
    folder_id=params.folder_id, dry_run=params.dry_run
  )
  return {
    "status": "success",
    "data": [{"name": d.name, "id": d.id} for d in dialogs],
  }


@router.post("/fetch-messages")
async def fetch_messages(
  params: schemas.TelegramFetchMessagesRequest,
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  messages = await service.get_messages(
    params.chat_id,
    params.new_only,
    params.max_messages,
    params.date_from,
    params.date_to,
    params.dry_run,
  )
  return {"status": "success", "message_count": len(messages)}


@router.get("/folders")
async def get_folders(
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  folders = await service.get_folders()
  results = []
  from telethon import types

  for f in folders:
    if isinstance(f, types.DialogFilter):
      results.append({"id": f.id, "title": f.title.text})
    elif isinstance(f, types.DialogFilterDefault):
      results.append({"id": 0, "title": "All Chats"})
  return {"status": "success", "data": results}


@router.post("/folder/add")
async def folder_add(
  params: schemas.TelegramFolderAddRemoveRequest,
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  success = await service.update_folder_chat(
    params.folder_id, params.chat_id, remove=False
  )
  if not success:
    raise HTTPException(status_code=400, detail="Chat already in folder or error")
  return {"status": "success"}


@router.post("/folder/remove")
async def folder_remove(
  params: schemas.TelegramFolderAddRemoveRequest,
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  success = await service.update_folder_chat(
    params.folder_id, params.chat_id, remove=True
  )
  if not success:
    raise HTTPException(status_code=400, detail="Chat not in folder or error")
  return {"status": "success"}


@router.post("/folder/create")
async def folder_create(
  params: schemas.TelegramFolderCreateRequest,
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  new_id = await service.create_folder(params.title, params.chat_id)
  return {"status": "success", "folder_id": new_id}


@router.delete("/folder/{folder_id}")
async def folder_delete(
  folder_id: int,
  user: Any = Depends(get_current_user),
  client: Any = Depends(get_started_client),
):
  await service.delete_folder(folder_id)
  return {"status": "success"}
