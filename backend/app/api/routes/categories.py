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
    return await product_service.list_categories(db)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category_route(
    data: CreateCategoryRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> CategoryResponse:
    category = await product_service.create_category(db, data)
    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
        parent_id=str(category.parent_id) if category.parent_id else None,
        is_archived=category.is_archived,
    )


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category_route(
    category_id: str,
    data: UpdateCategoryRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> CategoryResponse:
    category = await product_service.update_category(db, uuid.UUID(category_id), data)
    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
        parent_id=str(category.parent_id) if category.parent_id else None,
        is_archived=category.is_archived,
    )
