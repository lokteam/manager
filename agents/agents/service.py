from shared.models import session_context, VacancyReview, Prompt
from .db_ops import get_unreviewed_messages, save_reviews
from .processor import process_messages


async def run_review_cycle(
  system_prompt: str,
  batch_size: int = 10,
  account_id: int | None = None,
  chat_id: int | None = None,
  folder_id: int | None = None,
) -> int:
  """Run one cycle of message review. Returns number of messages processed."""
  with session_context() as session:
    messages = get_unreviewed_messages(
      session, batch_size, account_id=account_id, chat_id=chat_id, folder_id=folder_id
    )
    if not messages:
      return 0

    batch_output = await process_messages(messages, system_prompt)

    reviews_to_save = []
    for review_data in batch_output.reviews:
      # Find original message to get composite key parts
      orig_msg = next((m for m in messages if m.id == review_data.message_id), None)
      if not orig_msg:
        continue

      review = VacancyReview(
        message_id=review_data.message_id,
        dialog_id=orig_msg.dialog_id,
        account_id=orig_msg.account_id,
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


async def review_messages(
  prompt_id: int,
  max_messages: int | None = None,
  account_id: int | None = None,
  chat_id: int | None = None,
  folder_id: int | None = None,
):
  # Fetch prompt content
  with session_context() as session:
    prompt = session.get(Prompt, prompt_id)
    if not prompt:
      raise ValueError(f"Prompt with ID {prompt_id} not found")
    system_prompt = prompt.content

  processed_total = 0
  while True:
    batch_size = 10
    if max_messages is not None:
      remaining = max_messages - processed_total
      if remaining <= 0:
        break
      batch_size = min(10, remaining)

    num_processed = await run_review_cycle(
      system_prompt,
      batch_size,
      account_id=account_id,
      chat_id=chat_id,
      folder_id=folder_id,
    )
    if num_processed == 0:
      break

    processed_total += num_processed

    if num_processed < batch_size:
      break
  return processed_total
