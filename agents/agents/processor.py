from pydantic import BaseModel, Field
from pydantic_ai import Agent
from shared.models import Message, VacancyReviewDecision, ContactDTO


class MessageReviewOutput(BaseModel):
  """Structured output for a single message review."""

  message_id: int
  decision: VacancyReviewDecision
  contacts: list[ContactDTO] = Field(
    default_factory=list, description="List of extracted contacts"
  )
  vacancy_position: str = Field(default="", description="Position title")
  vacancy_description: str = Field(default="", description="Brief description")
  vacancy_requirements: str | None = Field(
    default=None, description="Requirements list"
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

  prompt = "Review the following messages:\n\n"
  for msg in messages:
    prompt += f"ID: {msg.id}\nText: {msg.text}\n---\n"

  agent = get_agent(system_prompt)
  result = await agent.run(prompt)
  return result.output
