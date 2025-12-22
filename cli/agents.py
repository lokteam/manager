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
  max_messages: int | None = typer.Option(None, help="Maximum messages to review"),
):
  """Main entry point for the review agent."""
  processed_total = asyncio.run(service.review_messages(max_messages))
  typer.echo(f"Done. Processed total: {processed_total} messages.")
