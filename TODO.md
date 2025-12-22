# Project TODO

## Completed

- [x] Telegram: Support date range `date_from` and `date_to` for listing messages.
- [x] Telegram: Destructure code (remove nested `async def f_` inside typer commands).
- [x] Telegram: Implement dry run in CLI (output to terminal, no database interaction).
- [x] Telegram: Fix callback execution on `--help` (move init to command execution).
- [x] Telegram: Save sessions to `telegram/telegram/sessions`.

## Pending

- [x] Check telegram changes manually
- [x] Add Alembic to `shared` module for database migrations
- [ ] Add telegram dialogs grouping by folder id (mapping folder names)
- [ ] Backend Module (FastAPI)
  - [ ] Make plan for backend
  - [ ] Implement JWT-based Auth
  - [ ] Implement SSO
  - [ ] Create CRUD endpoints for data
  - [ ] Implement "Bridge" to trigger CLI commands (telegram/agents)
- [ ] Frontend Module (React)
  - [ ] Initialize React app (Vite + TS + Tailwind)
  - [ ] Prepare for Cursor (create `.cursorrules`, update `AGENTS.md`)
  - [ ] Implement Dashboard and actions UI
