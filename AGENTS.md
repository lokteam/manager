# You are working on a production-grade personal Agent manager service.

## General rules:

- Prefer clarity over cleverness.
- Avoid unnecessary abstractions.
- Write code that can run 24/7 without supervision.
- Fail loudly and log errors explicitly.
- Do not introduce scalability patterns unless explicitly requested.

## Project constraints:

- Async-first architecture.
- Telethon for Telegram API.
- PydanticAi for AI agents.
- SQLite + SQLModel for storing data.
- Pydantic for all structured data.
- No global mutable state.

## Style rules:

- Prefer small functions.
- One responsibility per file where possible.
- Explicit is better than implicit.
- Avoid comments that restate the code.
- Use docstrings for intent, not implementation.
- All functions and methods must have type hints.

## Tools:

- Black for formatting.
- Ruff for linting.
- MyPy for type checking.
- uv for package management.

## Package Management with `uv`

These rules define strict guidelines for managing Python dependencies in this project using the `uv` dependency manager.

**Use `uv` exclusively**

- All Python dependencies **must be installed, synchronized, and locked** using `uv`.
- Never use `pip`, `pip-tools`, or `poetry` directly for dependency management.
