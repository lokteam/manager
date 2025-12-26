from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func, and_

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
  # Subquery to get the maximum version for each prompt ID
  subquery = (
    select(Prompt.id, func.max(Prompt.version).label("max_version"))
    .where(Prompt.user_id == user.id)
    .group_by(Prompt.id)
    .subquery()
  )

  # Join with the subquery to get only the latest versions that are not deleted
  statement = (
    select(Prompt)
    .join(
      subquery,
      and_(
        Prompt.id == subquery.c.id,
        Prompt.version == subquery.c.max_version,
      ),
    )
    .where(Prompt.user_id == user.id, Prompt.is_deleted == False)
  )
  result = await session.execute(statement)
  return result.scalars().all()


@router.get("/trash", response_model=list[schemas.PromptRead])
async def get_trash_prompts(
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  # Subquery to get the maximum version for each prompt ID
  subquery = (
    select(Prompt.id, func.max(Prompt.version).label("max_version"))
    .where(Prompt.user_id == user.id)
    .group_by(Prompt.id)
    .subquery()
  )

  statement = (
    select(Prompt)
    .join(
      subquery,
      and_(
        Prompt.id == subquery.c.id,
        Prompt.version == subquery.c.max_version,
      ),
    )
    .where(Prompt.user_id == user.id, Prompt.is_deleted == True)
  )
  result = await session.execute(statement)
  return result.scalars().all()


@router.post("/", response_model=schemas.PromptRead)
async def create_prompt(
  prompt_data: schemas.PromptCreate,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  # Get the next available ID
  id_statement = select(func.max(Prompt.id)).where(Prompt.user_id == user.id)
  id_result = await session.execute(id_statement)
  max_id = id_result.scalar() or 0
  new_id = max_id + 1

  prompt = Prompt(**prompt_data.model_dump(), id=new_id, version=1, user_id=user.id)
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
  # Get the latest version
  statement = (
    select(Prompt)
    .where(Prompt.id == prompt_id, Prompt.user_id == user.id)
    .order_by(Prompt.version.desc())
    .limit(1)
  )
  result = await session.execute(statement)
  prompt = result.scalar_one_or_none()
  if not prompt:
    raise HTTPException(status_code=404, detail="Prompt not found")
  return prompt


@router.get("/{prompt_id}/history", response_model=list[schemas.PromptRead])
async def get_prompt_history(
  prompt_id: int,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  statement = (
    select(Prompt)
    .where(Prompt.id == prompt_id, Prompt.user_id == user.id)
    .order_by(Prompt.version.desc())
  )
  result = await session.execute(statement)
  return result.scalars().all()


@router.patch("/{prompt_id}", response_model=schemas.PromptRead)
async def update_prompt(
  prompt_id: int,
  prompt_data: schemas.PromptUpdate,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  # Get the latest version
  statement = (
    select(Prompt)
    .where(Prompt.id == prompt_id, Prompt.user_id == user.id)
    .order_by(Prompt.version.desc())
    .limit(1)
  )
  result = await session.execute(statement)
  latest_prompt = result.scalar_one_or_none()
  if not latest_prompt:
    raise HTTPException(status_code=404, detail="Prompt not found")

  # Create a new version
  new_version = latest_prompt.version + 1
  data = latest_prompt.model_dump()
  data.update(prompt_data.model_dump(exclude_unset=True))
  data["version"] = new_version
  data.pop("created_at", None)  # Let it use default or we can set it

  new_prompt = Prompt(**data)
  session.add(new_prompt)
  await session.commit()
  await session.refresh(new_prompt)
  return new_prompt


@router.delete("/{prompt_id}")
async def delete_prompt(
  prompt_id: int,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  # Mark all versions as deleted
  statement = select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
  result = await session.execute(statement)
  prompts = result.scalars().all()
  if not prompts:
    raise HTTPException(status_code=404, detail="Prompt not found")

  for p in prompts:
    p.is_deleted = True
    session.add(p)

  await session.commit()
  return {"status": "success"}


@router.post("/{prompt_id}/restore")
async def restore_prompt(
  prompt_id: int,
  user: User = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  # Mark all versions as not deleted
  statement = select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == user.id)
  result = await session.execute(statement)
  prompts = result.scalars().all()
  if not prompts:
    raise HTTPException(status_code=404, detail="Prompt not found")

  for p in prompts:
    p.is_deleted = False
    session.add(p)

  await session.commit()
  return {"status": "success"}
