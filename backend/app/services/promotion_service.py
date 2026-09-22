import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.db.models.promotion import DiscountType, Promotion
from app.schemas.promotion import CreatePromotionRequest, UpdatePromotionRequest


class CouponInvalidError(AppError):
    status_code = 400
    code = "COUPON_INVALID"


async def get_active_coupon(db: AsyncSession, code: str) -> Promotion:
    result = await db.execute(select(Promotion).where(Promotion.code == code))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise CouponInvalidError("That coupon code does not exist.")
    return promotion


def validate_coupon_for_order(promotion: Promotion, subtotal: Decimal) -> None:
    now = datetime.now(timezone.utc)
    if not promotion.is_active:
        raise CouponInvalidError("That coupon is no longer active.")
    if now < promotion.start_date.replace(tzinfo=timezone.utc) or now > promotion.end_date.replace(tzinfo=timezone.utc):
        raise CouponInvalidError("That coupon has expired or is not yet active.")
    if promotion.usage_limit is not None and promotion.times_used >= promotion.usage_limit:
        raise CouponInvalidError("That coupon has reached its usage limit.")
    if promotion.min_order_amount is not None and subtotal < promotion.min_order_amount:
        raise CouponInvalidError(f"A minimum order of {promotion.min_order_amount} is required for this coupon.")


def calculate_discount(promotion: Promotion, subtotal: Decimal) -> Decimal:
    if promotion.discount_type == DiscountType.percentage:
        discount = subtotal * (promotion.discount_value / Decimal("100"))
        if promotion.max_discount_amount is not None:
            discount = min(discount, promotion.max_discount_amount)
    else:
        discount = promotion.discount_value
    return min(discount, subtotal)


# --- Admin management --------------------------------------------------------


async def list_promotions(db: AsyncSession, page: int, limit: int):
    from app.utils.pagination import clean_page_params, total_pages as compute_total_pages
    from sqlalchemy import func

    from app.schemas.common import PaginatedResponse
    from app.schemas.promotion import PromotionResponse

    params = clean_page_params(page, limit)
    total_items = (await db.execute(select(func.count()).select_from(Promotion))).scalar_one()
    result = await db.execute(select(Promotion).order_by(Promotion.created_at.desc()).offset(params.offset).limit(params.limit))
    items = [PromotionResponse.model_validate(p) for p in result.scalars().all()]
    return PaginatedResponse(items=items, page=params.page, limit=params.limit, total_items=total_items, total_pages=compute_total_pages(total_items, params.limit))


async def create_promotion(db: AsyncSession, data: CreatePromotionRequest) -> Promotion:
    existing = await db.execute(select(Promotion).where(Promotion.code == data.code))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("A promotion with this code already exists.")
    promotion = Promotion(
        code=data.code,
        discount_type=DiscountType(data.discount_type),
        discount_value=Decimal(data.discount_value),
        start_date=data.start_date,
        end_date=data.end_date,
        min_order_amount=Decimal(data.min_order_amount) if data.min_order_amount else None,
        max_discount_amount=Decimal(data.max_discount_amount) if data.max_discount_amount else None,
        usage_limit=data.usage_limit,
    )
    db.add(promotion)
    await db.commit()
    await db.refresh(promotion)
    return promotion


async def update_promotion(db: AsyncSession, promotion_id: uuid.UUID, data: UpdatePromotionRequest) -> Promotion:
    result = await db.execute(select(Promotion).where(Promotion.id == promotion_id))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise NotFoundError("Promotion not found.")
    updates = data.model_dump(exclude_unset=True)
    for field in ("discount_value", "min_order_amount", "max_discount_amount"):
        if updates.get(field) is not None:
            updates[field] = Decimal(updates[field])
    if updates.get("discount_type") is not None:
        updates["discount_type"] = DiscountType(updates["discount_type"])
    for key, value in updates.items():
        setattr(promotion, key, value)
    await db.commit()
    await db.refresh(promotion)
    return promotion


async def deactivate_promotion(db: AsyncSession, promotion_id: uuid.UUID) -> None:
    result = await db.execute(select(Promotion).where(Promotion.id == promotion_id))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise NotFoundError("Promotion not found.")
    promotion.is_active = False
    await db.commit()
