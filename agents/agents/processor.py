from pathlib import Path
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


def load_prompt(name: str) -> str:
  """Load prompt from md file."""
  path = Path(__file__).parent / "prompts" / f"{name}.md"
  return path.read_text(encoding="utf-8")


agent: Agent[None, BatchReviewOutput] = Agent(
  "google-gla:gemini-3-flash-preview",
  output_type=BatchReviewOutput,
  system_prompt=load_prompt("reviewer"),
)


async def process_messages(messages: list[Message]) -> BatchReviewOutput:
  """Process a batch of messages using the AI agent."""
  if not messages:
    return BatchReviewOutput(reviews=[])

  prompt = "Review the following messages:\n\n"
  for msg in messages:
    prompt += f"ID: {msg.id}\nText: {msg.text}\n---\n"

  result = await agent.run(prompt)
  return result.output
