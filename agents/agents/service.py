from shared.models import session_context, VacancyReview, Prompt
from .db_ops import get_messages_for_review, save_reviews
from .processor import process_messages


async def run_review_cycle(
  system_prompt: str,
  batch_size: int = 10,
  account_id: int | None = None,
  chat_id: int | None = None,
  folder_id: int | None = None,
  unreviewed_only: bool = True,
) -> int:
  """Run one cycle of message review. Returns number of messages processed."""
  # 1. Fetch messages and close session
  with session_context() as session:
    messages = get_messages_for_review(
      session,
      batch_size,
      account_id=account_id,
      chat_id=chat_id,
      folder_id=folder_id,
      unreviewed_only=unreviewed_only,
    )
    if not messages:
      return 0
    # Create a detached-like copy of needed data to avoid session issues
    # but since we are just reading, we can just keep them in memory.
    # We need to preserve the order for index mapping.
    message_data = [(m.id, m.dialog_id, m.account_id) for m in messages]

  # 2. Process with AI (No DB connection held)
  batch_output = await process_messages(messages, system_prompt)

  # 3. Save results in a new session
  reviews_to_save = []
  for review_data in batch_output.reviews:
    if review_data.index < 0 or review_data.index >= len(message_data):
      continue

    msg_id, diag_id, acc_id = message_data[review_data.index]

    review = VacancyReview(
      message_id=msg_id,
      dialog_id=diag_id,
      account_id=acc_id,
      decision=review_data.decision,
      contacts=review_data.contacts,
      vacancy_position=review_data.vacancy_position,
      vacancy_description=review_data.vacancy_description,
      vacancy_requirements=review_data.vacancy_requirements,
      salary_fork_from=review_data.salary_fork_from,
      salary_fork_to=review_data.salary_fork_to,
    )
    reviews_to_save.append(review)

  with session_context() as session:
    save_reviews(session, reviews_to_save)

  return len(messages)


async def review_messages(
  prompt_id: int,
  max_messages: int | None = None,
  account_id: int | None = None,
  chat_id: int | None = None,
  folder_id: int | None = None,
  unreviewed_only: bool = True,
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
      unreviewed_only=unreviewed_only,
    )
    if num_processed == 0:
      break

    processed_total += num_processed

    if num_processed < batch_size:
      break
  return processed_total
