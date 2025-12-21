# You are working on a production-grade personal Agent manager service.

## General rules:

- Prefer clarity over cleverness.
- Avoid unnecessary abstractions.
- Write code that can run 24/7 without supervision.
- Fail loudly and log errors explicitly.
- Do not introduce scalability patterns unless explicitly requested.
- Always check the most fresh documentation for the library with Context7 before writing code.
- Follow the latest rules and styling for libraries. Do not use deprecated or old-fashioned (like in previous library version) methods, syntax, etc.

## Project constraints:

- Typer for CLI.
- Telethon for Telegram API.
- PydanticAi for AI agents.
- SQLite + SQLModel for storing data.
- Pydantic for all structured data.
- No global mutable state.

## Style rules:

- 2 space indentation
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
- Context7 MCP server to fetch documentation.
- Bright Data MCP server for web search if unsure.

## Package Management with `uv`

These rules define strict guidelines for managing Python dependencies in this project using the `uv` dependency manager.

**Use `uv` exclusively**

- All Python dependencies **must be installed, synchronized, and locked** using `uv`.
- Never use `pip`, `pip-tools`, or `poetry` directly for dependency management.
