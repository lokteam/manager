from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from shared.models import (
  TelegramAccount,
  Folder,
  Dialog,
  Message,
  VacancyReview,
  VacancyProgress,
  get_async_session,
  User,
)
from backend.auth.deps import get_current_user
from . import schemas
from .telegram_router import router as telegram_router
from .agents_router import router as agents_router
from typing import Annotated

api_router = APIRouter()

# Telegram and Agents Routers
api_router.include_router(telegram_router)
api_router.include_router(agents_router)


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
  status_code=status.HTTP_201_CREATED,
  response_model=schemas.TelegramAccountRead,
)
async def create_account(
  data: schemas.TelegramAccountCreate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = TelegramAccount(**data.model_dump(), user_id=current_user.id)
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


@api_router.post(
  "/folders",
  tags=["Folders"],
  status_code=status.HTTP_201_CREATED,
  response_model=schemas.FolderRead,
)
async def create_folder(
  data: schemas.FolderCreate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  folder = Folder(**data.model_dump(), user_id=current_user.id)
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
  account_ids = await get_user_account_ids(current_user.id, session)
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
  account = await session.get(TelegramAccount, account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  dialog = await session.get(Dialog, (id, account_id))
  if not dialog:
    raise HTTPException(status_code=404, detail="Dialog not found")
  return dialog


@api_router.post(
  "/dialogs",
  tags=["Dialogs"],
  status_code=status.HTTP_201_CREATED,
  response_model=schemas.DialogRead,
)
async def create_dialog(
  data: schemas.DialogCreate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, data.account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  dialog = Dialog(**data.model_dump())
  session.add(dialog)
  await session.commit()
  await session.refresh(dialog)
  return dialog


@api_router.patch(
  "/dialogs/{account_id}/{id}", tags=["Dialogs"], response_model=schemas.DialogRead
)
async def update_dialog(
  account_id: int,
  id: int,
  data: schemas.DialogUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  dialog = await session.get(Dialog, (id, account_id))
  if not dialog:
    raise HTTPException(status_code=404, detail="Dialog not found")

  for key, value in data.model_dump(exclude_unset=True).items():
    setattr(dialog, key, value)

  session.add(dialog)
  await session.commit()
  await session.refresh(dialog)
  return dialog


@api_router.delete(
  "/dialogs/{account_id}/{id}", tags=["Dialogs"], status_code=status.HTTP_204_NO_CONTENT
)
async def delete_dialog(
  account_id: int,
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  dialog = await session.get(Dialog, (id, account_id))
  if not dialog:
    raise HTTPException(status_code=404, detail="Dialog not found")

  await session.delete(dialog)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Message ---


@api_router.get(
  "/messages", tags=["Messages"], response_model=list[schemas.MessageRead]
)
async def get_messages(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account_ids = await get_user_account_ids(current_user.id, session)
  if not account_ids:
    return []
  result = await session.execute(
    select(Message).where(Message.account_id.in_(account_ids))
  )
  return list(result.scalars().all())


@api_router.get(
  "/messages/{account_id}/{dialog_id}/{id}",
  tags=["Messages"],
  response_model=schemas.MessageRead,
)
async def get_message(
  account_id: int,
  dialog_id: int,
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  message = await session.get(Message, (id, dialog_id, account_id))
  if not message:
    raise HTTPException(status_code=404, detail="Message not found")
  return message


@api_router.post(
  "/messages",
  tags=["Messages"],
  status_code=status.HTTP_201_CREATED,
  response_model=schemas.MessageRead,
)
async def create_message(
  data: schemas.MessageCreate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, data.account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  message = Message(**data.model_dump())
  session.add(message)
  await session.commit()
  await session.refresh(message)
  return message


@api_router.patch(
  "/messages/{account_id}/{dialog_id}/{id}",
  tags=["Messages"],
  response_model=schemas.MessageRead,
)
async def update_message(
  account_id: int,
  dialog_id: int,
  id: int,
  data: schemas.MessageUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  message = await session.get(Message, (id, dialog_id, account_id))
  if not message:
    raise HTTPException(status_code=404, detail="Message not found")

  for key, value in data.model_dump(exclude_unset=True).items():
    setattr(message, key, value)

  session.add(message)
  await session.commit()
  await session.refresh(message)
  return message


@api_router.delete(
  "/messages/{account_id}/{dialog_id}/{id}",
  tags=["Messages"],
  status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_message(
  account_id: int,
  dialog_id: int,
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account = await session.get(TelegramAccount, account_id)
  if not account or account.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  message = await session.get(Message, (id, dialog_id, account_id))
  if not message:
    raise HTTPException(status_code=404, detail="Message not found")

  await session.delete(message)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- VacancyReview ---


@api_router.get(
  "/reviews", tags=["Reviews"], response_model=list[schemas.VacancyReviewRead]
)
async def get_reviews(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account_ids = await get_user_account_ids(current_user.id, session)
  if not account_ids:
    return []
  result = await session.execute(
    select(VacancyReview).where(VacancyReview.account_id.in_(account_ids))
  )
  return list(result.scalars().all())


@api_router.get(
  "/reviews/{id}", tags=["Reviews"], response_model=schemas.VacancyReviewRead
)
async def get_review(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  review = await session.get(VacancyReview, id)
  if not review:
    raise HTTPException(status_code=404, detail="Review not found")

  account_ids = await get_user_account_ids(current_user.id, session)
  if review.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this review")

  return review


@api_router.post(
  "/reviews",
  tags=["Reviews"],
  status_code=status.HTTP_201_CREATED,
  response_model=schemas.VacancyReviewRead,
)
async def create_review(
  data: schemas.VacancyReviewCreate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account_ids = await get_user_account_ids(current_user.id, session)
  if data.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this account")

  review = VacancyReview(**data.model_dump())
  session.add(review)
  await session.commit()
  await session.refresh(review)
  return review


@api_router.patch(
  "/reviews/{id}", tags=["Reviews"], response_model=schemas.VacancyReviewRead
)
async def update_review(
  id: int,
  data: schemas.VacancyReviewUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  review = await session.get(VacancyReview, id)
  if not review:
    raise HTTPException(status_code=404, detail="Review not found")

  account_ids = await get_user_account_ids(current_user.id, session)
  if review.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this review")

  for key, value in data.model_dump(exclude_unset=True).items():
    setattr(review, key, value)

  session.add(review)
  await session.commit()
  await session.refresh(review)
  return review


@api_router.delete(
  "/reviews/{id}", tags=["Reviews"], status_code=status.HTTP_204_NO_CONTENT
)
async def delete_review(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  review = await session.get(VacancyReview, id)
  if not review:
    raise HTTPException(status_code=404, detail="Review not found")

  account_ids = await get_user_account_ids(current_user.id, session)
  if review.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this review")

  await session.delete(review)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- VacancyProgress ---


@api_router.get(
  "/progress", tags=["Progress"], response_model=list[schemas.VacancyProgressRead]
)
async def get_progress_list(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  account_ids = await get_user_account_ids(current_user.id, session)
  if not account_ids:
    return []
  result = await session.execute(
    select(VacancyProgress)
    .join(VacancyReview)
    .where(VacancyReview.account_id.in_(account_ids))
  )
  return list(result.scalars().all())


@api_router.get(
  "/progress/{id}", tags=["Progress"], response_model=schemas.VacancyProgressRead
)
async def get_progress(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  progress = await session.get(VacancyProgress, id)
  if not progress:
    raise HTTPException(status_code=404, detail="Progress not found")

  review = await session.get(VacancyReview, progress.review_id)
  account_ids = await get_user_account_ids(current_user.id, session)
  if not review or review.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this progress")

  return progress


@api_router.post(
  "/progress",
  tags=["Progress"],
  status_code=status.HTTP_201_CREATED,
  response_model=schemas.VacancyProgressRead,
)
async def create_progress(
  data: schemas.VacancyProgressCreate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  review = await session.get(VacancyReview, data.review_id)
  account_ids = await get_user_account_ids(current_user.id, session)
  if not review or review.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this review")

  progress = VacancyProgress(**data.model_dump())
  session.add(progress)
  await session.commit()
  await session.refresh(progress)
  return progress


@api_router.patch(
  "/progress/{id}", tags=["Progress"], response_model=schemas.VacancyProgressRead
)
async def update_progress(
  id: int,
  data: schemas.VacancyProgressUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  progress = await session.get(VacancyProgress, id)
  if not progress:
    raise HTTPException(status_code=404, detail="Progress not found")

  review = await session.get(VacancyReview, progress.review_id)
  account_ids = await get_user_account_ids(current_user.id, session)
  if not review or review.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this progress")

  for key, value in data.model_dump(exclude_unset=True).items():
    setattr(progress, key, value)

  session.add(progress)
  await session.commit()
  await session.refresh(progress)
  return progress


@api_router.delete(
  "/progress/{id}", tags=["Progress"], status_code=status.HTTP_204_NO_CONTENT
)
async def delete_progress(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  progress = await session.get(VacancyProgress, id)
  if not progress:
    raise HTTPException(status_code=404, detail="Progress not found")

  review = await session.get(VacancyReview, progress.review_id)
  account_ids = await get_user_account_ids(current_user.id, session)
  if not review or review.account_id not in account_ids:
    raise HTTPException(status_code=403, detail="Not authorized for this progress")

  await session.delete(progress)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)
