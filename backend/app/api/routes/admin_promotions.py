import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.promotion import CreatePromotionRequest, PromotionResponse, UpdatePromotionRequest
from app.services import promotion_service

router = APIRouter(prefix="/admin/promotions", tags=["admin-promotions"])


@router.get("", response_model=PaginatedResponse[PromotionResponse])
async def list_promotions_route(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> PaginatedResponse[PromotionResponse]:
    return await promotion_service.list_promotions(db, page, limit)


@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion_route(
    data: CreatePromotionRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> PromotionResponse:
    promotion = await promotion_service.create_promotion(db, data)
    return PromotionResponse.model_validate(promotion)


@router.patch("/{promotion_id}", response_model=PromotionResponse)
async def update_promotion_route(
    promotion_id: str, data: UpdatePromotionRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> PromotionResponse:
    promotion = await promotion_service.update_promotion(db, uuid.UUID(promotion_id), data)
    return PromotionResponse.model_validate(promotion)


@router.delete("/{promotion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_promotion_route(promotion_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> None:
    await promotion_service.deactivate_promotion(db, uuid.UUID(promotion_id))
