import asyncio
import typer
from shared.models import init_db
from agents.agents import service

app = typer.Typer(name="agents")


@app.callback()
def callback():
  init_db()


@app.command()
def review(
  prompt_id: int = typer.Option(..., "--prompt-id", help="Prompt ID to use"),
  user_id: int = typer.Option(..., "--user-id", help="User ID owning the prompt"),
  max_messages: int | None = typer.Option(
    None, "--max", help="Maximum messages to review"
  ),
):
  """Main entry point for the review agent."""
  processed_total = asyncio.run(
    service.review_messages(
      prompt_id=prompt_id, user_id=user_id, max_messages=max_messages
    )
  )
  typer.echo(f"Done. Processed total: {processed_total} messages.")
