from sqlmodel import Session, select
from shared.models import Message, VacancyReview, VacancyProgress, VacancyReviewDecision


def get_unreviewed_messages(
  session: Session,
  limit: int,
  account_id: int | None = None,
  chat_id: int | None = None,
  folder_id: int | None = None,
) -> list[Message]:
  """Retrieve messages that haven't been reviewed yet, with optional filtering."""
  from shared.models import DialogFolderLink

  statement = select(Message).where(Message.review == None)  # noqa: E711

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
    session.add(review)
    session.flush()

    if review.decision == VacancyReviewDecision.APPROVE:
      progress = VacancyProgress(review_id=review.id)
      session.add(progress)

  session.commit()
