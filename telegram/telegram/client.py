import os
from telethon import TelegramClient
from shared import models as db

api_id = int(os.getenv("API_ID", 0))
api_hash = os.getenv("API_HASH", "")

_client: TelegramClient | None = None


def get_client() -> TelegramClient:
  global _client
  if _client is None:
    session_path = os.path.join(
      os.path.dirname(os.path.abspath(__file__)), "sessions", "al_addr"
    )
    _client = TelegramClient(session_path, api_id, api_hash)
  return _client


def run_async(func, *args, **kwargs):
  """Initialize resources and run an async function in the client loop"""
  client = get_client()
  db.init_db()
  client.start()
  try:
    return client.loop.run_until_complete(func(*args, **kwargs))
  finally:
    client.disconnect()
