from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from shared.models import (
  VacancyProgress,
  VacancyReview,
  Message,
  Dialog,
  TelegramAccount,
  get_async_session,
  User,
)
from backend.auth.deps import get_current_user
from . import schemas
from typing import Annotated

from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/", response_model=list[schemas.VacancyProgressReadWithReview])
async def get_progress_list(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  # Get all progress records for vacancies belonging to the current user
  # Use explicit join conditions
  statement = (
    select(
      VacancyProgress,
      Message.dialog_id,
      Dialog.account_id,
      Dialog.telegram_id.label("telegram_dialog_id"),
      Message.telegram_id.label("telegram_message_id"),
      Dialog.username.label("dialog_username"),
    )
    .join(VacancyReview, VacancyProgress.review_id == VacancyReview.id)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(TelegramAccount.user_id == current_user.id)
    .options(joinedload(VacancyProgress.review))
  )
  result = await session.execute(statement)

  progress_list = []
  for (
    progress,
    dialog_id,
    account_id,
    telegram_dialog_id,
    telegram_message_id,
    dialog_username,
  ) in result.all():
    # Progress is already loaded with review due to joinedload
    # We need to ensure the review has the extra fields required by VacancyReviewRead
    if progress.review:
      # Create a dict for review data and inject extra fields
      r_data = progress.review.model_dump()
      r_data["dialog_id"] = dialog_id
      r_data["account_id"] = account_id
      r_data["telegram_dialog_id"] = telegram_dialog_id
      r_data["telegram_message_id"] = telegram_message_id
      r_data["dialog_username"] = dialog_username

      # Use model_validate to create a VacancyReviewRead object (or just keep as dict)
      # Pydantic will handle dict if it matches schema
      progress_dict = progress.model_dump()
      progress_dict["review"] = r_data
      progress_list.append(progress_dict)

  return progress_list


@router.get("/{id}", response_model=schemas.VacancyProgressReadWithReview)
async def get_progress(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  statement = (
    select(
      VacancyProgress,
      Message.dialog_id,
      Dialog.account_id,
      Dialog.telegram_id.label("telegram_dialog_id"),
      Message.telegram_id.label("telegram_message_id"),
      Dialog.username.label("dialog_username"),
    )
    .join(VacancyReview, VacancyProgress.review_id == VacancyReview.id)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(VacancyProgress.id == id, TelegramAccount.user_id == current_user.id)
    .options(joinedload(VacancyProgress.review))
  )
  result = await session.execute(statement)
  row = result.first()
  if not row:
    raise HTTPException(status_code=404, detail="Progress record not found")

  (
    progress,
    dialog_id,
    account_id,
    telegram_dialog_id,
    telegram_message_id,
    dialog_username,
  ) = row

  progress_dict = progress.model_dump()
  if progress.review:
    r_data = progress.review.model_dump()
    r_data["dialog_id"] = dialog_id
    r_data["account_id"] = account_id
    r_data["telegram_dialog_id"] = telegram_dialog_id
    r_data["telegram_message_id"] = telegram_message_id
    r_data["dialog_username"] = dialog_username
    progress_dict["review"] = r_data

  return progress_dict


@router.patch("/{id}", response_model=schemas.VacancyProgressReadWithReview)
async def update_progress(
  id: int,
  data: schemas.VacancyProgressUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  statement = (
    select(
      VacancyProgress,
      Message.dialog_id,
      Dialog.account_id,
      Dialog.telegram_id.label("telegram_dialog_id"),
      Message.telegram_id.label("telegram_message_id"),
      Dialog.username.label("dialog_username"),
    )
    .join(VacancyReview, VacancyProgress.review_id == VacancyReview.id)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(VacancyProgress.id == id, TelegramAccount.user_id == current_user.id)
    .options(joinedload(VacancyProgress.review))
  )
  result = await session.execute(statement)
  row = result.first()
  if not row:
    raise HTTPException(status_code=404, detail="Progress record not found")

  (
    progress,
    dialog_id,
    account_id,
    telegram_dialog_id,
    telegram_message_id,
    dialog_username,
  ) = row

  update_data = data.model_dump(exclude_unset=True)
  for key, value in update_data.items():
    setattr(progress, key, value)

  session.add(progress)
  await session.commit()
  await session.refresh(progress)

  progress_dict = progress.model_dump()
  if progress.review:
    r_data = progress.review.model_dump()
    r_data["dialog_id"] = dialog_id
    r_data["account_id"] = account_id
    r_data["telegram_dialog_id"] = telegram_dialog_id
    r_data["telegram_message_id"] = telegram_message_id
    r_data["dialog_username"] = dialog_username
    progress_dict["review"] = r_data

  return progress_dict


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_progress(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  statement = (
    select(VacancyProgress)
    .join(VacancyReview, VacancyProgress.review_id == VacancyReview.id)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(VacancyProgress.id == id, TelegramAccount.user_id == current_user.id)
  )
  result = await session.execute(statement)
  progress = result.scalar_one_or_none()
  if not progress:
    raise HTTPException(status_code=404, detail="Progress record not found")

  await session.delete(progress)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)
