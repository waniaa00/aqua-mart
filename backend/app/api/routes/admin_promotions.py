import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.promotion import CreatePromotionRequest, PromotionResponse, UpdatePromotionRequest
from app.services import promotion_service

router = APIRouter(prefix="/admin/promotions", tags=["admin-promotions"])


def _to_response(promotion) -> PromotionResponse:
    return PromotionResponse(
        id=str(promotion.id),
        code=promotion.code,
        discount_type=promotion.discount_type.value,
        discount_value=str(promotion.discount_value),
        start_date=promotion.start_date,
        end_date=promotion.end_date,
        min_order_amount=str(promotion.min_order_amount) if promotion.min_order_amount is not None else None,
        max_discount_amount=str(promotion.max_discount_amount) if promotion.max_discount_amount is not None else None,
        usage_limit=promotion.usage_limit,
        times_used=promotion.times_used,
        is_active=promotion.is_active,
    )


@router.get("", response_model=list[PromotionResponse])
async def list_promotions_route(
    db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)
) -> list[PromotionResponse]:
    promotions = await promotion_service.list_promotions(db)
    return [_to_response(p) for p in promotions]


@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion_route(
    data: CreatePromotionRequest, db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)
) -> PromotionResponse:
    return _to_response(await promotion_service.create_promotion(db, data))


@router.patch("/{promotion_id}", response_model=PromotionResponse)
async def update_promotion_route(
    promotion_id: str,
    data: UpdatePromotionRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> PromotionResponse:
    return _to_response(await promotion_service.update_promotion(db, uuid.UUID(promotion_id), data))


@router.delete("/{promotion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_promotion_route(
    promotion_id: str, db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)
) -> None:
    await promotion_service.deactivate_promotion(db, uuid.UUID(promotion_id))
