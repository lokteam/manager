from fastapi import APIRouter
from fastcrud import FastCRUD, crud_router
from shared.models import (
  TelegramAccount,
  Folder,
  Dialog,
  Message,
  VacancyReview,
  VacancyProgress,
  get_async_session,
)
from backend.auth.deps import get_current_user
from . import schemas

api_router = APIRouter()

# TelegramAccount Router
telegram_account_crud: FastCRUD[
  TelegramAccount, schemas.TelegramAccountCreate, schemas.TelegramAccountUpdate
] = FastCRUD(TelegramAccount)
api_router.include_router(
  crud_router(
    session=get_async_session,
    model=TelegramAccount,
    crud=telegram_account_crud,
    create_schema=schemas.TelegramAccountCreate,
    update_schema=schemas.TelegramAccountUpdate,
    path="/accounts",
    tags=["Accounts"],
    read_deps=[get_current_user],
    create_deps=[get_current_user],
    update_deps=[get_current_user],
    delete_deps=[get_current_user],
  )
)

# Folder Router
folder_crud: FastCRUD[Folder, schemas.FolderCreate, schemas.FolderUpdate] = FastCRUD(
  Folder
)
api_router.include_router(
  crud_router(
    session=get_async_session,
    model=Folder,
    crud=folder_crud,
    create_schema=schemas.FolderCreate,
    update_schema=schemas.FolderUpdate,
    path="/folders",
    tags=["Folders"],
    read_deps=[get_current_user],
    create_deps=[get_current_user],
    update_deps=[get_current_user],
    delete_deps=[get_current_user],
  )
)

# Dialog Router
dialog_crud: FastCRUD[Dialog, schemas.DialogCreate, schemas.DialogUpdate] = FastCRUD(
  Dialog
)
api_router.include_router(
  crud_router(
    session=get_async_session,
    model=Dialog,
    crud=dialog_crud,
    create_schema=schemas.DialogCreate,
    update_schema=schemas.DialogUpdate,
    path="/dialogs",
    tags=["Dialogs"],
    read_deps=[get_current_user],
    create_deps=[get_current_user],
    update_deps=[get_current_user],
    delete_deps=[get_current_user],
  )
)

# Message Router
message_crud: FastCRUD[Message, schemas.MessageCreate, schemas.MessageUpdate] = (
  FastCRUD(Message)
)
api_router.include_router(
  crud_router(
    session=get_async_session,
    model=Message,
    crud=message_crud,
    create_schema=schemas.MessageCreate,
    update_schema=schemas.MessageUpdate,
    path="/messages",
    tags=["Messages"],
    read_deps=[get_current_user],
    create_deps=[get_current_user],
    update_deps=[get_current_user],
    delete_deps=[get_current_user],
  )
)

# VacancyReview Router
vacancy_review_crud: FastCRUD[
  VacancyReview, schemas.VacancyReviewCreate, schemas.VacancyReviewUpdate
] = FastCRUD(VacancyReview)
api_router.include_router(
  crud_router(
    session=get_async_session,
    model=VacancyReview,
    crud=vacancy_review_crud,
    create_schema=schemas.VacancyReviewCreate,
    update_schema=schemas.VacancyReviewUpdate,
    path="/reviews",
    tags=["Reviews"],
    read_deps=[get_current_user],
    create_deps=[get_current_user],
    update_deps=[get_current_user],
    delete_deps=[get_current_user],
  )
)

# VacancyProgress Router
vacancy_progress_crud: FastCRUD[
  VacancyProgress, schemas.VacancyProgressCreate, schemas.VacancyProgressUpdate
] = FastCRUD(VacancyProgress)
api_router.include_router(
  crud_router(
    session=get_async_session,
    model=VacancyProgress,
    crud=vacancy_progress_crud,
    create_schema=schemas.VacancyProgressCreate,
    update_schema=schemas.VacancyProgressUpdate,
    path="/progress",
    tags=["Progress"],
    read_deps=[get_current_user],
    create_deps=[get_current_user],
    update_deps=[get_current_user],
    delete_deps=[get_current_user],
  )
)
