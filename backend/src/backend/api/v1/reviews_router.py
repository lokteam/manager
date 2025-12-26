from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from shared.models import (
  VacancyReview,
  TelegramAccount,
  Message,
  Dialog,
  get_async_session,
  User,
)
from backend.auth.deps import get_current_user
from . import schemas
from typing import Annotated

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/", response_model=list[schemas.VacancyReviewRead])
async def get_reviews(
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  # Get all reviews for accounts belonging to the current user
  # Use select_from and explicit join conditions to avoid ambiguity
  statement = (
    select(
      VacancyReview,
      Message.dialog_id,
      Dialog.account_id,
      Dialog.telegram_id.label("telegram_dialog_id"),
      Message.telegram_id.label("telegram_message_id"),
      Dialog.username.label("dialog_username"),
      Dialog.name.label("dialog_name"),
      TelegramAccount.name.label("account_name"),
      TelegramAccount.username.label("account_username"),
    )
    .select_from(VacancyReview)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(TelegramAccount.user_id == current_user.id)
  )
  result = await session.execute(statement)

  reviews = []
  for row in result.all():
    review = row[0]
    r_data = review.model_dump()
    r_data["dialog_id"] = row.dialog_id
    r_data["account_id"] = row.account_id
    r_data["telegram_dialog_id"] = row.telegram_dialog_id
    r_data["telegram_message_id"] = row.telegram_message_id
    r_data["dialog_username"] = row.dialog_username
    r_data["dialog_name"] = row.dialog_name
    r_data["account_name"] = row.account_name
    r_data["account_username"] = row.account_username
    reviews.append(r_data)

  return reviews


@router.get("/{id}", response_model=schemas.VacancyReviewRead)
async def get_review(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  # Verify ownership and get extra IDs
  statement = (
    select(
      VacancyReview,
      Message.dialog_id,
      Dialog.account_id,
      Dialog.telegram_id.label("telegram_dialog_id"),
      Message.telegram_id.label("telegram_message_id"),
      Dialog.username.label("dialog_username"),
      Dialog.name.label("dialog_name"),
      TelegramAccount.name.label("account_name"),
      TelegramAccount.username.label("account_username"),
    )
    .select_from(VacancyReview)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(VacancyReview.id == id, TelegramAccount.user_id == current_user.id)
  )
  result = await session.execute(statement)
  row = result.first()
  if not row:
    raise HTTPException(status_code=404, detail="Review not found")

  review = row[0]
  r_data = review.model_dump()
  r_data["dialog_id"] = row.dialog_id
  r_data["account_id"] = row.account_id
  r_data["telegram_dialog_id"] = row.telegram_dialog_id
  r_data["telegram_message_id"] = row.telegram_message_id
  r_data["dialog_username"] = row.dialog_username
  r_data["dialog_name"] = row.dialog_name
  r_data["account_name"] = row.account_name
  r_data["account_username"] = row.account_username
  return r_data


@router.patch("/{id}", response_model=schemas.VacancyReviewRead)
async def update_review(
  id: int,
  data: schemas.VacancyReviewUpdate,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  # We need the full row for the response schema
  statement = (
    select(
      VacancyReview,
      Message.dialog_id,
      Dialog.account_id,
      Dialog.telegram_id.label("telegram_dialog_id"),
      Message.telegram_id.label("telegram_message_id"),
      Dialog.username.label("dialog_username"),
      Dialog.name.label("dialog_name"),
      TelegramAccount.name.label("account_name"),
      TelegramAccount.username.label("account_username"),
    )
    .select_from(VacancyReview)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(VacancyReview.id == id, TelegramAccount.user_id == current_user.id)
  )
  result = await session.execute(statement)
  row = result.first()
  if not row:
    raise HTTPException(status_code=404, detail="Review not found")

  (
    review,
    dialog_id,
    account_id,
    telegram_dialog_id,
    telegram_message_id,
    dialog_username,
    dialog_name,
    account_name,
    account_username,
  ) = row
  update_data = data.model_dump(exclude_unset=True)
  for key, value in update_data.items():
    setattr(review, key, value)

  session.add(review)
  await session.commit()
  await session.refresh(review)

  r_data = review.model_dump()
  r_data["dialog_id"] = dialog_id
  r_data["account_id"] = account_id
  r_data["telegram_dialog_id"] = telegram_dialog_id
  r_data["telegram_message_id"] = telegram_message_id
  r_data["dialog_username"] = dialog_username
  r_data["dialog_name"] = dialog_name
  r_data["account_name"] = account_name
  r_data["account_username"] = account_username
  return r_data


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
  id: int,
  current_user: Annotated[User, Depends(get_current_user)],
  session: AsyncSession = Depends(get_async_session),
):
  statement = (
    select(VacancyReview)
    .join(Message, VacancyReview.message_id == Message.id)
    .join(Dialog, Message.dialog_id == Dialog.id)
    .join(TelegramAccount, Dialog.account_id == TelegramAccount.id)
    .where(VacancyReview.id == id, TelegramAccount.user_id == current_user.id)
  )
  result = await session.execute(statement)
  review = result.scalar_one_or_none()
  if not review:
    raise HTTPException(status_code=404, detail="Review not found")

  await session.delete(review)
  await session.commit()
  return Response(status_code=status.HTTP_204_NO_CONTENT)
