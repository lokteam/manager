from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from shared.models import (
  TelegramAccount,
  Folder,
  Dialog,
  get_async_session,
  User,
)
from backend.auth.deps import get_current_user
from . import schemas
from .telegram_router import router as telegram_router
from .agents_router import router as agents_router
from .prompts_router import router as prompts_router
from .reviews_router import router as reviews_router
from .progress_router import router as progress_router
from typing import Annotated
import asyncio
from telegram import client as tg_client
from telegram import service as tg_service

api_router = APIRouter()

# Telegram and Agents Routers
api_router.include_router(telegram_router)
api_router.include_router(agents_router)
api_router.include_router(prompts_router)
api_router.include_router(reviews_router)
api_router.include_router(progress_router)


# Helper to get user's account IDs for hierarchical filtering
async def get_user_account_ids(user_id: int, session: AsyncSession) -> list[int]:
  result = await session.execute(
    select(TelegramAccount.id).where(TelegramAccount.user_id == user_id)
  )
  return list(result.scalars().all())


# --- TelegramAccount ---


@api_router.get(
  "/accounts", tags=["Accounts"], response_model=list[schemas.TelegramAccountRead]
)
async def get_accounts(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  result = await session.execute(
    select(TelegramAccount).where(TelegramAccount.user_id == current_user.id)
  )
  return list(result.scalars().all())


@api_router.get(
  "/accounts/{id}", tags=["Accounts"], response_model=schemas.TelegramAccountRead
)
async def get_account(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=404, detail="Account not found")
  return account


@api_router.post(
  "/accounts",
  tags=["Accounts"],
)
async def create_account(
  data: schemas.TelegramAccountCreate,
  current_user: Annotated[User, Depends(get_current_user)],
):
  client = await tg_client.get_client(data.api_id, data.api_hash)
  # Start the sign-in process in the background
  asyncio.create_task(tg_client.sign_in_request(client, data.phone))
  return {"status": "pending", "message": "Code requested"}


@api_router.post(
  "/accounts/confirm",
  tags=["Accounts"],
  response_model=schemas.TelegramAccountRead,
)
async def confirm_account(
  data: schemas.TelegramAccountConfirm,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  login_res = await tg_client.wait_for_login(data.phone, data.code)
  if not login_res:
    raise HTTPException(status_code=400, detail="Failed to login or timeout")

  session_str, me, api_id, api_hash = login_res

  # Check if account already exists
  result = await session.execute(
    select(TelegramAccount).where(TelegramAccount.id == me.id)
  )
  account = result.scalars().first()

  if account:
    if account.user_id != current_user.id:
      raise HTTPException(
        status_code=400, detail="Account already linked to another user"
      )
    # Update existing
    account.session_string = session_str
    account.name = (me.first_name or "") + (" " + me.last_name if me.last_name else "")
    account.username = me.username
  else:
    # Create new
    account = TelegramAccount(
      id=me.id,
      user_id=current_user.id,
      api_id=api_id,
      api_hash=api_hash,
      phone=data.phone,
      session_string=session_str,
      name=(me.first_name or "") + (" " + me.last_name if me.last_name else ""),
      username=me.username,
    )

  session.add(account)
  await session.commit()
  await session.refresh(account)
  return account


@api_router.patch(
  "/accounts/{id}", tags=["Accounts"], response_model=schemas.TelegramAccountRead
)
async def update_account(
  id: int,
  data: schemas.TelegramAccountUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=404, detail="Account not found")

  for key, value in data.model_dump(exclude_unset=True).items():
    setattr(account, key, value)

  session.add(account)
  await session.commit()
  await session.refresh(account)
  return account


@api_router.delete(
  "/accounts/{id}", tags=["Accounts"], status_code=status.HTTP_204_NO_CONTENT
)
async def delete_account(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=404, detail="Account not found")

  await session.delete(account)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Folder ---


@api_router.get("/folders", tags=["Folders"], response_model=list[schemas.FolderRead])
async def get_folders(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  result = await session.execute(
    select(Folder).where(Folder.user_id == current_user.id)
  )
  return list(result.scalars().all())


@api_router.get("/folders/{id}", tags=["Folders"], response_model=schemas.FolderRead)
async def get_folder(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  folder = await session.get(Folder, id)
  if not folder or folder.user_id != current_user.id:
    raise HTTPException(status_code=404, detail="Folder not found")
  return folder


@api_router.post("/folders", tags=["Folders"], response_model=schemas.FolderRead)
async def create_folder(
  data: schemas.FolderCreate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  folder = Folder(name=data.name, user_id=current_user.id)
  session.add(folder)
  await session.commit()
  await session.refresh(folder)
  return folder


@api_router.patch("/folders/{id}", tags=["Folders"], response_model=schemas.FolderRead)
async def update_folder(
  id: int,
  data: schemas.FolderUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  folder = await session.get(Folder, id)
  if not folder or folder.user_id != current_user.id:
    raise HTTPException(status_code=404, detail="Folder not found")

  for key, value in data.model_dump(exclude_unset=True).items():
    setattr(folder, key, value)

  session.add(folder)
  await session.commit()
  await session.refresh(folder)
  return folder


@api_router.delete(
  "/folders/{id}", tags=["Folders"], status_code=status.HTTP_204_NO_CONTENT
)
async def delete_folder(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  folder = await session.get(Folder, id)
  if not folder or folder.user_id != current_user.id:
    raise HTTPException(status_code=404, detail="Folder not found")

  await session.delete(folder)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Dialog ---


@api_router.get("/dialogs", tags=["Dialogs"], response_model=list[schemas.DialogRead])
async def get_dialogs(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  # Get user's accounts
  result = await session.execute(
    select(TelegramAccount).where(TelegramAccount.user_id == current_user.id)
  )
  accounts = result.scalars().all()

  # Sync each account in parallel
  async def sync_account(account):
    try:
      client = await tg_client.get_client(
        account.api_id, account.api_hash, account.session_string, account.id
      )
      if not client.is_connected():
        await client.connect()
      if await client.is_user_authorized():
        await tg_service.sync_dialogs(client)
    except Exception as e:
      print(f"Failed to sync account {account.id}: {e}")

  await asyncio.gather(*(sync_account(acc) for acc in accounts))

  # Return dialogs for all user's accounts
  account_ids = [acc.id for acc in accounts]
  if not account_ids:
    return []

  result = await session.execute(
    select(Dialog).where(Dialog.account_id.in_(account_ids))
  )
  return list(result.scalars().all())


@api_router.get(
  "/dialogs/{account_id}/{id}", tags=["Dialogs"], response_model=schemas.DialogRead
)
async def get_dialog(
  account_id: int,
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  # Check ownership via account
  account = await session.get(TelegramAccount, account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=404, detail="Account not found")

  dialog = await session.get(Dialog, (id, account_id))
  if not dialog:
    raise HTTPException(status_code=404, detail="Dialog not found")
  return dialog
