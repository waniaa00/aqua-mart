import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.product import CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest
from app.services import product_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories_route(db: AsyncSession = Depends(get_db)) -> list[CategoryResponse]:
    categories = await product_service.list_categories(db)
    return [CategoryResponse.model_validate(c) for c in categories]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category_route(
    data: CreateCategoryRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> CategoryResponse:
    category = await product_service.create_category(db, data)
    return CategoryResponse.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category_route(
    category_id: str,
    data: UpdateCategoryRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> CategoryResponse:
    category = await product_service.update_category(db, uuid.UUID(category_id), data)
    return CategoryResponse.model_validate(category)
