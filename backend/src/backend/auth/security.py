import os
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from typing import Any

SECRET_KEY = os.environ.get("JWT_SECRET")
if not SECRET_KEY:
  if os.environ.get("ENV") == "prod":
    raise RuntimeError("JWT_SECRET environment variable is required in production")
  SECRET_KEY = "dev-secret-change-me-in-prod"

ALGORITHM = os.environ.get("JWT_ALG", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
  data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
  to_encode = data.copy()
  if expires_delta:
    expire = datetime.now(timezone.utc) + expires_delta
  else:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  to_encode.update({"exp": expire})
  encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
  return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
  return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
  return pwd_context.hash(password)


def decode_access_token(token: str) -> dict[str, Any] | None:
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    # PyJWT handles expiration validation by default if 'exp' is present
    return payload
  except jwt.PyJWTError:
    return None
