import os
from fastapi_sso.sso.google import GoogleSSO

# These should be set in environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "your-google-client-secret")

google_sso = GoogleSSO(
  client_id=GOOGLE_CLIENT_ID,
  client_secret=GOOGLE_CLIENT_SECRET,
  allow_insecure_http=True,  # Set to False in production
)
