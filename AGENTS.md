# Agent Guidelines & Project Overview

Welcome to the **Manager** project. This document serves as the primary entry point for AI agents and developers to understand the project's architecture, tech stack, and development standards.

## Project Overview
**Manager** is a specialized system designed to automate the extraction, review, and management of job vacancies from Telegram. It leverages AI agents for structured data extraction and provides a unified dashboard for tracking recruitment progress.

## Project Structure
The repository is organized into a modular workspace:

- **`agents/`**: Core AI logic. Uses PydanticAI to process Telegram messages and extract structured vacancy data.
- **`backend/`**: FastAPI-based web server. Handles authentication (including Google SSO), API routing, and serves as the bridge between the database and frontend.
- **`frontend/`**: Modern React 19 application. A dashboard for managing Telegram accounts, viewing extracted vacancies, and tracking candidate progress.
- **`shared/`**: Centralized data layer. Contains SQLModel definitions and Alembic migrations used by all backend services.
- **`telegram/`**: Telethon-based integration. Handles communication with the Telegram API, session management, and message fetching.
- **`cli/`**: Typer-based command-line interface for administrative tasks and project orchestration.
- **`root/`**: Project-wide configuration and helper scripts (`./run`, `./migrate`).

## Commands
- **Backend:**
  - Lint: `uv run ruff check .` | Format: `uv run ruff format .`
  - Types: `uv run mypy .` | Tests: `uv run pytest`
  - CLI: `./run [command]` | Migrations: `./migrate [check|apply|revert] [message]`
- **Frontend:**
  - Dev: `npm run dev` | Build: `npm run build` | Lint: `npm run lint`

## Tech Stack & Patterns
- **Language:** Python 3.13+ (Backend), TypeScript (Frontend).
- **Core Libraries:**
  - **Backend:** PydanticAI (Reasoning), FastAPI (API), SQLModel (ORM), Telethon (Telegram).
  - **Frontend:** React 19, Vite, Tailwind CSS 4, TanStack Query, Zustand.
- **Database:** SQLite with `aiosqlite` for async support. Custom JSON serialization for complex Pydantic types in models.
- **Agents:** Structured outputs via Gemini models. Prompts are stored as `.md` files in `agents/prompts/`.

## Development Standards
- **Typing:** Strict Python 3.13+ typing. Use `int | None` instead of `Optional[int]`. All functions must have return types.
- **Indentation:** 2 spaces across all file types (Python, TS, CSS).
- **Imports:** Use absolute imports (e.g., `from shared.models import ...`).
- **Research:** Always use `Context7` for library documentation and `Bright Data` for searching current best practices.
- **Logging:** Fail loudly. Log errors explicitly and ensure one responsibility per file/function.
