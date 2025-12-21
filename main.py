import typer
from telegram.main import app as telegram_app
from agents.main import app as agents_app

app = typer.Typer()

# Register sub-apps
app.add_typer(telegram_app, name="telegram")
app.add_typer(agents_app, name="agents")

if __name__ == "__main__":
  app()
