from sqlmodel import select
from shared import models as db

# Инициализация БД
db.init_db()


def get_all_dialogs():
    with db.get_session() as session:
        statement = select(db.Dialog)
        results = session.exec(statement)
        return results.all()


if __name__ == "__main__":
    dialogs = get_all_dialogs()
    print(f"Found {len(dialogs)} dialogs in the shared database.")
    for dialog in dialogs:
        print(f" - {dialog.name} ({dialog.entity_type})")
