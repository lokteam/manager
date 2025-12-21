from sqlmodel import Session, select
from shared.models import Message, VacancyReview, VacancyProgress, VacancyReviewDecision


def get_unreviewed_messages(session: Session, limit: int) -> list[Message]:
  """Retrieve messages that haven't been reviewed yet."""
  statement = select(Message).where(Message.review == None).limit(limit)  # noqa: E711
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
