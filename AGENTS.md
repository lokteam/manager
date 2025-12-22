# Agent Guidelines
**Commands:**
- Lint: `uv run ruff check .` | Format: `uv run ruff format .`
- Types: `uv run mypy .` | Tests: `uv run pytest` (Single: `uv run pytest path/to/test.py::test_name`)
**Code Style:**
- Indentation: 2 spaces. Line length: 88. No global mutable state.
- Typing: Modern Python 3.13+ (`int | None`, `list[str]`). NO `List`, `Optional`, or legacy syntax.
- Documentation: Docstrings for intent. All functions MUST have type hints. No restating comments.
- Quality: Fail loudly and log explicitly. One responsibility per file. Small functions.
- Imports: Absolute imports. Grouped: stdlib, third-party, local workspace.
**Tech Stack & Patterns:**
- Typer (CLI), Telethon (Telegram), PydanticAI (Agents), SQLModel (SQLite), Pydantic (Data).
- DB: SQLite + custom JSON serialization for Pydantic (check `shared/models.py`).
- Rules: Always fetch fresh docs via `Context7`. Follow latest library syntaxes.
**Development:**
- Use `uv` EXCLUSIVELY for dependencies. Never use `pip` or `poetry`.
- Proactively use `Context7` and `Bright Data` for research.
- Mimic existing styles in `agents/`, `telegram/`, and `shared/` directories.
