from pydantic import BaseModel, Field
from pydantic_ai import Agent
from shared.models import (
  Message,
  VacancyReviewDecision,
  ContactDTO,
  Seniority,
  Experience,
)


class MessageReviewOutput(BaseModel):
  """Structured output for a single message review."""

  index: int = Field(description="Index of the message from the input list")
  decision: VacancyReviewDecision
  seniority: Seniority | None = Field(
    default=None,
    description="Seniority level: TRAINEE, JUNIOR, MIDDLE, SENIOR, LEAD. MUST be provided if decision is APPROVE.",
  )
  experience: Experience | None = Field(
    default=None,
    description="Years of experience required. Parse from text (e.g., '3+ years' -> from=3, to=null).",
  )
  contacts: list[ContactDTO] = Field(
    default_factory=list, description="List of extracted contacts"
  )
  vacancy_position: str = Field(default="", description="Position title")
  vacancy_description: str = Field(default="", description="Brief description")
  vacancy_requirements: list[str] | None = Field(
    default=None, description="List of requirements"
  )
  salary_fork_from: int | None = None
  salary_fork_to: int | None = None


class BatchReviewOutput(BaseModel):
  """Structured output for a batch of message reviews."""

  reviews: list[MessageReviewOutput]


def get_agent(system_prompt: str) -> Agent[None, BatchReviewOutput]:
  """Create an agent with the given system prompt."""
  return Agent(
    "google-gla:gemini-3-flash-preview",
    output_type=BatchReviewOutput,
    system_prompt=system_prompt,
  )


async def process_messages(
  messages: list[Message], system_prompt: str
) -> BatchReviewOutput:
  """Process a batch of messages using the AI agent."""
  if not messages:
    return BatchReviewOutput(reviews=[])

  system_prompt += """
**Instructions:**
1. Set 'decision' to 'APPROVE' only if it matches the above criteria.
2. For approved vacancies, extract: position, description, seniority, experience, requirements, salary range, and contacts.
3. 'seniority' is MANDATORY for approved vacancies. It should be one of: TRAINEE, JUNIOR, MIDDLE, SENIOR, LEAD. 
   - If there is no direct hint in the message, you MUST infer it from the requirements, salary, or responsibilities described.
   - For example, if it mentions "3+ years", "architect", or "mentoring", it's likely SENIOR or LEAD. 
   - Never leave this field empty for approved vacancies.
4. 'experience' should be an object with 'from' and 'to' integer values representing years.
   - "3+ years" -> {"from": 3, "to": null}
   - "2-5 years" -> {"from": 2, "to": 5}
   - "up to 1 year" -> {"from": null, "to": 1}
   - If not mentioned, set both to null or leave as null.
5. 'vacancy_requirements' should be a list of strings, each string representing a single requirement.

4. Contacts should be objects with 'type' and 'value'.
   **Use the following keys for 'type':**
   - PHONE: Mobile phone number
   - EMAIL: Email address
   - TELEGRAM_USERNAME: Username in telegram, usually starts with @
   - TELEGRAM_ID: Numerical ID of the sender. Use this if the message suggests contacting the sender directly (e.g., "DM me", "write to PM"). Use the provided 'Sender ID' for this.
   - EXTERNAL_PLATFORM: Link to vacancy on head hunting platform (e.g. hh.ru, linkedin, etc.)
   - OTHER: Use this for any other contact type not listed above.
5. If dismissed, set 'decision' to 'DISMISS' and leave other fields empty/default.
"""

  prompt = "Review the following messages:\n\n"
  for i, msg in enumerate(messages):
    sender_info = f"Sender ID: {msg.from_id}"
    # Note: If we decide to add username to Message model, we'd include it here
    prompt += f"INDEX: {i}\n{sender_info}\nText: {msg.text}\n---\n"

  agent = get_agent(system_prompt)
  result = await agent.run(prompt)
  return result.output
