import typer
from telegram.main import app as telegram_app
from agents.main import get_all_dialogs

app = typer.Typer()

# Добавляем телеграм как подкоманду
app.add_typer(telegram_app, name="telegram")


@app.command()
def list_dialogs():
    """List all dialogs from the shared database (using agents logic)"""
    dialogs = get_all_dialogs()
    print(f"Found {len(dialogs)} dialogs in the shared database.")
    for dialog in dialogs:
        print(f" - {dialog.name} ({dialog.entity_type})")


if __name__ == "__main__":
    app()
