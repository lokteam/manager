from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from shared.models import User, UserRole, get_async_session
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(
  token: Annotated[str, Depends(oauth2_scheme)],
  session: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
  credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
  )
  payload = decode_access_token(token)
  if payload is None:
    raise credentials_exception
  email = payload.get("sub")
  if not isinstance(email, str):
    raise credentials_exception

  result = await session.execute(select(User).where(User.email == email))
  user = result.scalars().first()
  if user is None:
    raise credentials_exception
  return user


def check_role(required_role: UserRole):
  def role_checker(current_user: Annotated[User, Depends(get_current_user)]):
    if current_user.role != required_role and current_user.role != UserRole.ADMIN:
      raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions",
      )
    return current_user

  return role_checker
