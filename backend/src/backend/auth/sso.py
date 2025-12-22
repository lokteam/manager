import os
from fastapi_sso.sso.google import GoogleSSO

# These should be set in environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
ENV = os.getenv("ENV", "dev")

google_sso = GoogleSSO(
  client_id=GOOGLE_CLIENT_ID or "",
  client_secret=GOOGLE_CLIENT_SECRET or "",
  allow_insecure_http=ENV != "prod",
)
