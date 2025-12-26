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

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/", response_model=list[schemas.VacancyProgressRead])
async def get_progress_list(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  # Get all progress records for vacancies belonging to the current user
  # Use explicit join conditions
  statement = (
    select(VacancyProgress)
    .join(VacancyReview, VacancyProgress.review_id == VacancyReview.id)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(TelegramAccount.user_id == current_user.id)
  )
  result = await session.execute(statement)
  return list(result.scalars().all())


@router.get("/{id}", response_model=schemas.VacancyProgressRead)
async def get_progress(
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
  return progress


@router.patch("/{id}", response_model=schemas.VacancyProgressRead)
async def update_progress(
  id: int,
  data: schemas.VacancyProgressUpdate,
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

  update_data = data.model_dump(exclude_unset=True)
  for key, value in update_data.items():
    setattr(progress, key, value)

  session.add(progress)
  await session.commit()
  await session.refresh(progress)
  return progress


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
