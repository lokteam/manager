import typer
from typing import List
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.test import TestModel
from sqlalchemy import text
from shared import models as db

db.init_db()

app = typer.Typer()

agent = Agent(
    "google-gla:gemini-3-flash-preview",
    system_prompt=(
        "You are a database assistant. Your task is to retrieve messages from the database. "
        "Use the provided tool to execute SQL queries. "
        "Always return a list of Message objects."
    ),
)
