from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from agents import service
from backend.auth.deps import get_current_user
from shared.models import get_async_session, Prompt
from . import schemas

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.post("/review")
async def review(
  params: schemas.AgentReviewRequest,
  user: Any = Depends(get_current_user),
  session: AsyncSession = Depends(get_async_session),
):
  # 1. Verify prompt ownership
  statement = select(Prompt).where(
    Prompt.id == params.prompt_id, Prompt.user_id == user.id
  )
  result = await session.execute(statement)
  prompt = result.scalar_one_or_none()
  if not prompt:
    raise HTTPException(status_code=404, detail="Prompt not found or access denied")

  try:
    processed_total = await service.review_messages(
      prompt_id=params.prompt_id,
      max_messages=params.max_messages,
      account_id=params.account_id,
      chat_id=params.chat_id,
      folder_id=params.folder_id,
      unreviewed_only=params.unreviewed_only,
    )
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

  return {"status": "success", "processed_total": processed_total}
