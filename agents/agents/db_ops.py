from sqlalchemy.orm import joinedload
from sqlmodel import Session, select
from shared.models import (
  Message,
  VacancyReview,
  VacancyProgress,
  VacancyReviewDecision,
  Dialog,
  TelegramAccount,
)


def get_messages_for_review(
  session: Session,
  limit: int,
  account_id: int | None = None,
  chat_id: int | None = None,
  folder_id: int | None = None,
  unreviewed_only: bool = True,
) -> list[Message]:
  """Retrieve messages for review, with optional filtering."""
  from shared.models import DialogFolderLink

  statement = select(Message).options(
    joinedload(Message.dialog).joinedload(Dialog.account)
  )
  if unreviewed_only:
    statement = statement.where(Message.review == None)  # noqa: E711

  if account_id is not None or folder_id is not None or chat_id is not None:
    statement = statement.join(Dialog, Message.dialog_id == Dialog.id)

  if account_id is not None:
    statement = statement.where(Dialog.account_id == account_id)

  if chat_id is not None:
    # Here chat_id is the internal surrogate ID of the dialog
    statement = statement.where(Dialog.id == chat_id)

  if folder_id is not None:
    # Join with DialogFolderLink to filter by folder
    statement = statement.join(
      DialogFolderLink,
      Dialog.id == DialogFolderLink.dialog_id,
    ).where(DialogFolderLink.folder_id == folder_id)

  statement = statement.limit(limit)
  return list(session.exec(statement).all())


def save_reviews(session: Session, reviews: list[VacancyReview]) -> None:
  """Save reviews and create initial progress records for approved ones."""
  for review in reviews:
    # Check if review already exists for this message
    existing_statement = select(VacancyReview).where(
      VacancyReview.message_id == review.message_id
    )
    existing_review = session.exec(existing_statement).first()

    if existing_review:
      # Update existing review fields
      for key, value in review.model_dump(exclude={"id"}).items():
        setattr(existing_review, key, value)
      review = existing_review
    else:
      session.add(review)

    session.flush()

    # Create progress only if it doesn't exist and decision is APPROVE
    if review.decision == VacancyReviewDecision.APPROVE:
      existing_progress = session.exec(
        select(VacancyProgress).where(VacancyProgress.review_id == review.id)
      ).first()
      if not existing_progress:
        progress = VacancyProgress(review_id=review.id)
        session.add(progress)

  session.commit()
