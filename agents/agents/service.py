from shared.models import (
  session_context,
  VacancyReview,
  Prompt,
  ContactType,
)
from .db_ops import get_messages_for_review, save_reviews
from .processor import process_messages
from telegram.client import get_client
from telegram.service import resolve_username
from sqlmodel import select


async def run_review_cycle(
  system_prompt: str,
  prompt_id: int | None = None,
  prompt_version: int | None = None,
  batch_size: int = 10,
  account_id: int | None = None,
  chat_id: int | None = None,
  folder_id: int | None = None,
  unreviewed_only: bool = True,
) -> int:
  """Run one cycle of message review. Returns number of messages processed."""
  # 1. Fetch messages
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

    # We need to keep references to messages and their clients
    # message.dialog.account is available due to joinedload
    msg_configs = []
    for m in messages:
      acc = m.dialog.account
      msg_configs.append(
        {
          "msg_id": m.id,
          "api_id": acc.api_id,
          "api_hash": acc.api_hash,
          "session_string": acc.session_string,
          "account_id": acc.id,
        }
      )

  # 2. Process with AI
  batch_output = await process_messages(messages, system_prompt)

  # 3. Resolve Telegram IDs to Usernames
  reviews_to_save = []
  clients = {}

  for review_data in batch_output.reviews:
    if review_data.index < 0 or review_data.index >= len(msg_configs):
      continue

    cfg = msg_configs[review_data.index]

    # Resolve any TELEGRAM_ID contacts
    for contact in review_data.contacts:
      if contact.type == ContactType.TELEGRAM_ID:
        try:
          # Get or create client for this account
          acc_id = cfg["account_id"]
          if acc_id not in clients:
            clients[acc_id] = await get_client(
              cfg["api_id"], cfg["api_hash"], cfg["session_string"], account_id=acc_id
            )

          client = clients[acc_id]
          if contact.value.isdigit():
            tg_id = int(contact.value)
            username = await resolve_username(client, tg_id)
            if username:
              contact.type = ContactType.TELEGRAM_USERNAME
              contact.value = username
        except Exception:
          pass

    review = VacancyReview(
      message_id=cfg["msg_id"],
      decision=review_data.decision,
      seniority=review_data.seniority,
      contacts=review_data.contacts,
      vacancy_position=review_data.vacancy_position,
      vacancy_description=review_data.vacancy_description,
      vacancy_requirements=review_data.vacancy_requirements,
      salary_fork_from=review_data.salary_fork_from,
      salary_fork_to=review_data.salary_fork_to,
      prompt_id=prompt_id,
      prompt_version=prompt_version,
    )
    reviews_to_save.append(review)

  # 4. Save results
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
    # Get the latest version of the prompt
    statement = (
      select(Prompt)
      .where(Prompt.id == prompt_id)
      .order_by(Prompt.version.desc())
      .limit(1)
    )
    prompt = session.exec(statement).first()
    if not prompt:
      raise ValueError(f"Prompt with ID {prompt_id} not found")
    system_prompt = prompt.content
    prompt_version = prompt.version

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
      prompt_id=prompt_id,
      prompt_version=prompt_version,
      batch_size=batch_size,
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
