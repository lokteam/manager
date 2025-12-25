from sqlmodel import Session, select
from shared.models import Message, VacancyReview, VacancyProgress, VacancyReviewDecision


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

  statement = select(Message)
  if unreviewed_only:
    statement = statement.where(Message.review == None)  # noqa: E711

  if account_id is not None:
    statement = statement.where(Message.account_id == account_id)

  if chat_id is not None:
    statement = statement.where(Message.dialog_id == chat_id)

  if folder_id is not None:
    # Join with DialogFolderLink to filter by folder
    statement = statement.join(
      DialogFolderLink,
      (Message.dialog_id == DialogFolderLink.dialog_id)
      & (Message.account_id == DialogFolderLink.account_id),
    ).where(DialogFolderLink.folder_id == folder_id)

  statement = statement.limit(limit)
  return list(session.exec(statement).all())


def save_reviews(session: Session, reviews: list[VacancyReview]) -> None:
  """Save reviews and create initial progress records for approved ones."""
  for review in reviews:
    # Check if review already exists for this message
    existing_statement = select(VacancyReview).where(
      VacancyReview.message_id == review.message_id,
      VacancyReview.dialog_id == review.dialog_id,
      VacancyReview.account_id == review.account_id,
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
