from fastapi import APIRouter, Depends
from typing import Any
from agents import service
from backend.auth.deps import get_current_user
from . import schemas

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.post("/review")
async def review(
  params: schemas.AgentReviewRequest,
  user: Any = Depends(get_current_user),
):
  processed_total = await service.review_messages(
    prompt_id=params.prompt_id,
    max_messages=params.max_messages,
    account_id=params.account_id,
    chat_id=params.chat_id,
    folder_id=params.folder_id,
  )
  return {"status": "success", "processed_total": processed_total}
