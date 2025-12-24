from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from telegram import service
from telegram.client import get_client
from backend.auth.deps import get_current_user
from shared.models import TelegramAccount, User, get_async_session
from . import schemas
from typing import Annotated

router = APIRouter(prefix="/telegram", tags=["Telegram"])


async def get_account_client(account_id: int, user_id: int, session: AsyncSession):
  result = await session.execute(
    select(TelegramAccount).where(
      TelegramAccount.id == account_id, TelegramAccount.user_id == user_id
    )
  )
  account = result.scalars().first()
  if not account:
    raise HTTPException(status_code=404, detail="Telegram account not found")

  client = await get_client(
    account.api_id, account.api_hash, account.session_string, account.id
  )
  if not client.is_connected():
    await client.connect()
  if not await client.is_user_authorized():
    raise HTTPException(status_code=401, detail="Telegram account not authorized")
  return client


@router.post("/fetch")
async def fetch(
  params: schemas.TelegramFetchRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  dialogs = await service.sync_dialogs(
    client, folder_id=params.folder_id, dry_run=params.dry_run
  )
  results = []
  for dialog in dialogs:
    messages = await service.get_messages(
      client,
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
  return results


@router.post("/fetch-chats")
async def fetch_chats(
  params: schemas.TelegramFetchChatsRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  dialogs = await service.sync_dialogs(
    client, folder_id=params.folder_id, dry_run=params.dry_run
  )
  return [{"name": d.name, "id": d.id} for d in dialogs]


@router.post("/fetch-messages")
async def fetch_messages(
  params: schemas.TelegramFetchMessagesRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  messages = await service.get_messages(
    client,
    params.chat_id,
    params.new_only,
    params.max_messages,
    params.date_from,
    params.date_to,
    params.dry_run,
  )
  return {"message_count": len(messages)}


@router.get("/folders")
async def get_folders(
  account_id: int,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(account_id, user.id, session)
  return await service.get_folders(client)


@router.post("/folder/add")
async def folder_add(
  params: schemas.TelegramFolderAddRemoveRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  await service.update_folder_chat(
    client, params.folder_id, params.chat_id, remove=False
  )
  return {"status": "success"}


@router.post("/folder/remove")
async def folder_remove(
  params: schemas.TelegramFolderAddRemoveRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  await service.update_folder_chat(
    client, params.folder_id, params.chat_id, remove=True
  )
  return {"status": "success"}


@router.post("/folder/bulk-add")
async def folder_bulk_add(
  params: schemas.TelegramFolderBulkAddRemoveRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  await service.update_folder_chats(
    client, params.folder_id, params.chat_ids, remove=False
  )
  return {"status": "success"}


@router.post("/folder/bulk-remove")
async def folder_bulk_remove(
  params: schemas.TelegramFolderBulkAddRemoveRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  await service.update_folder_chats(
    client, params.folder_id, params.chat_ids, remove=True
  )
  return {"status": "success"}


@router.post("/folder/create")
async def folder_create(
  params: schemas.TelegramFolderCreateRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  new_id = await service.create_folder(client, params.title, params.chat_id)
  return {"id": new_id, "title": params.title}


@router.patch("/folder/rename")
async def folder_rename(
  params: schemas.TelegramFolderRenameRequest,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(params.account_id, user.id, session)
  await service.rename_folder(client, params.folder_id, params.title)
  return {"status": "success", "title": params.title}


@router.delete("/folder/{folder_id}")
async def folder_delete(
  folder_id: int,
  account_id: int,
  user: Annotated[User, Depends(get_current_user)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
):
  client = await get_account_client(account_id, user.id, session)
  await service.delete_folder(client, folder_id)
  return {"status": "success"}
