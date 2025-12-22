from shared.models import get_session, VacancyReview
from .db_ops import get_unreviewed_messages, save_reviews
from .processor import process_messages


async def run_review_cycle(batch_size: int = 10) -> int:
  """Run one cycle of message review. Returns number of messages processed."""
  with get_session() as session:
    messages = get_unreviewed_messages(session, batch_size)
    if not messages:
      return 0

    batch_output = await process_messages(messages)

    reviews_to_save = []
    for review_data in batch_output.reviews:
      review = VacancyReview(
        message_id=review_data.message_id,
        decision=review_data.decision,
        contacts=review_data.contacts,
        vacancy_position=review_data.vacancy_position,
        vacancy_description=review_data.vacancy_description,
        vacancy_requirements=review_data.vacancy_requirements,
        salary_fork_from=review_data.salary_fork_from,
        salary_fork_to=review_data.salary_fork_to,
      )
      reviews_to_save.append(review)

    save_reviews(session, reviews_to_save)
    return len(messages)


async def review_messages(max_messages: int | None = None):
  processed_total = 0
  while True:
    batch_size = 10
    if max_messages is not None:
      remaining = max_messages - processed_total
      if remaining <= 0:
        break
      batch_size = min(10, remaining)

    num_processed = await run_review_cycle(batch_size)
    if num_processed == 0:
      break

    processed_total += num_processed

    if num_processed < batch_size:
      break
  return processed_total
