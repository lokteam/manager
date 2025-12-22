from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from shared.models import User, UserRole, get_async_session
from .auth.security import create_access_token, verify_password, get_password_hash
from .auth.sso import google_sso
from .auth.deps import get_current_user
from .api.v1.routers import api_router
from typing import Annotated

app = FastAPI(title="Manager Backend")

# Include API routers
app.include_router(api_router, prefix="/api/v1")

# CORS configuration
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],  # Adjust as needed for your frontend
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.post("/auth/register")
async def register(
  email: str,
  password: str,
  full_name: str | None = None,
  session: AsyncSession = Depends(get_async_session),
):
  result = await session.execute(select(User).where(User.email == email))
  existing_user = result.scalars().first()
  if existing_user:
    raise HTTPException(status_code=400, detail="Email already registered")

  new_user = User(
    email=email,
    hashed_password=get_password_hash(password),
    full_name=full_name,
    role=UserRole.USER,
  )
  session.add(new_user)
  await session.commit()
  await session.refresh(new_user)
  return {"message": "User created successfully"}


@app.post("/auth/login")
async def login(
  form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
  session: AsyncSession = Depends(get_async_session),
):
  result = await session.execute(select(User).where(User.email == form_data.username))
  user = result.scalars().first()
  if (
    not user
    or not user.hashed_password
    or not verify_password(form_data.password, user.hashed_password)
  ):
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Incorrect email or password",
      headers={"WWW-Authenticate": "Bearer"},
    )

  access_token = create_access_token(data={"sub": user.email})
  return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/sso/google/login")
async def google_login():
  async with google_sso:
    return await google_sso.get_login_redirect(
      redirect_uri="http://localhost:8000/auth/sso/google/callback"
    )


@app.get("/auth/sso/google/callback")
async def google_callback(
  request: Request, session: AsyncSession = Depends(get_async_session)
):
  async with google_sso:
    user_info = await google_sso.verify_and_process(request)

    if not user_info:
      raise HTTPException(status_code=400, detail="SSO verification failed")

    result = await session.execute(select(User).where(User.email == user_info.email))
    user = result.scalars().first()
    if not user:
      user = User(
        email=user_info.email,
        full_name=user_info.display_name,
        sso_provider="google",
        sso_id=user_info.id,
      )
      session.add(user)
      await session.commit()
      await session.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me")
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
  return current_user
