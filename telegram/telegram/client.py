import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession

# Registry for pending logins: {phone: (code_future, result_future, client)}
_pending_logins: dict[str, tuple[asyncio.Future, asyncio.Future, TelegramClient]] = {}

# Keep track of active clients: {account_id: TelegramClient}
_active_clients: dict[int, TelegramClient] = {}


async def get_client(
  api_id: int,
  api_hash: str,
  session_string: str | None = None,
  account_id: int | None = None,
) -> TelegramClient:
  """Get or create a TelegramClient instance"""
  if account_id and account_id in _active_clients:
    client = _active_clients[account_id]
    if client.is_connected():
      return client

  client = TelegramClient(StringSession(session_string), api_id, api_hash)
  if account_id:
    client.account_id = account_id
    _active_clients[account_id] = client
  return client


async def sign_in_request(client: TelegramClient, phone: str):
  """
  Starts the sign-in process.
  """
  loop = asyncio.get_running_loop()
  code_future = loop.create_future()
  result_future = loop.create_future()
  _pending_logins[phone] = (code_future, result_future, client)

  async def code_callback():
    return await code_future

  try:
    if not client.is_connected():
      await client.connect()
    await client.start(phone=phone, code_callback=code_callback)

    session_str = client.session.save()
    me = await client.get_me()
    result_future.set_result((session_str, me, client.api_id, client.api_hash))
  except Exception as e:
    if not result_future.done():
      result_future.set_exception(e)
  finally:
    # We don't remove from _pending_logins here yet
    # because the confirm_account might still be waiting for result_future
    pass


async def wait_for_login(phone: str, code: str):
  """Provide the code and wait for the result"""
  if phone not in _pending_logins:
    return None

  code_future, result_future, _ = _pending_logins[phone]
  if not code_future.done():
    code_future.set_result(code)

  try:
    return await result_future
  finally:
    if phone in _pending_logins:
      del _pending_logins[phone]


def run_async(func, *args, **kwargs):
  """
  Initialize resources and run an async function.
  This is for CLI usage where we might not have a running loop yet.
  """
  from shared import models as db

  db.init_db()

  loop = asyncio.new_event_loop()
  asyncio.set_event_loop(loop)

  # In CLI, we might need a default account if not provided
  # For now, let's just run the func.
  # The func is responsible for getting the client.
  try:
    return loop.run_until_complete(func(*args, **kwargs))
  finally:
    loop.close()
