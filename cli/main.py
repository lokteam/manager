import typer
from .telegram import app as telegram_app
from .agents import app as agents_app

app = typer.Typer()

app.add_typer(telegram_app, name="telegram")
app.add_typer(agents_app, name="agents")


def main():
  app()


if __name__ == "__main__":
  main()
