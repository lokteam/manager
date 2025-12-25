from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from shared.models import Prompt, get_async_session, User
from backend.auth.deps import get_current_user
from . import schemas
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/prompts", tags=["Prompts"])


@router.get("/", response_model=list[schemas.PromptRead])
async def get_prompts(
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  statement = select(Prompt).where(Prompt.user_id == user.id)
  result = await session.execute(statement)
  return result.scalars().all()


@router.post("/", response_model=schemas.PromptRead)
async def create_prompt(
  prompt_data: schemas.PromptCreate,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  prompt = Prompt(**prompt_data.model_dump(), user_id=user.id)
  session.add(prompt)
  await session.commit()
  await session.refresh(prompt)
  return prompt


@router.get("/{prompt_id}", response_model=schemas.PromptRead)
async def get_prompt(
  prompt_id: int,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  statement = select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
  result = await session.execute(statement)
  prompt = result.scalar_one_or_none()
  if not prompt:
    raise HTTPException(status_code=404, detail="Prompt not found")
  return prompt


@router.patch("/{prompt_id}", response_model=schemas.PromptRead)
async def update_prompt(
  prompt_id: int,
  prompt_data: schemas.PromptUpdate,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  statement = select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
  result = await session.execute(statement)
  prompt = result.scalar_one_or_none()
  if not prompt:
    raise HTTPException(status_code=404, detail="Prompt not found")

  data = prompt_data.model_dump(exclude_unset=True)
  for key, value in data.items():
    setattr(prompt, key, value)

  session.add(prompt)
  await session.commit()
  await session.refresh(prompt)
  return prompt


@router.delete("/{prompt_id}")
async def delete_prompt(
  prompt_id: int,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  statement = select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
  result = await session.execute(statement)
  prompt = result.scalar_one_or_none()
  if not prompt:
    raise HTTPException(status_code=404, detail="Prompt not found")

  await session.delete(prompt)
  await session.commit()
  return {"status": "success"}
