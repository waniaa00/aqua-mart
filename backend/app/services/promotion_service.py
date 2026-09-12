import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.db.models.promotion import DiscountType, Promotion
from app.schemas.promotion import CreatePromotionRequest, UpdatePromotionRequest


async def _get_active_valid_promotion(db: AsyncSession, code: str, order_amount: Decimal) -> Promotion:
    result = await db.execute(select(Promotion).where(Promotion.code == code))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise ValidationAppError("This coupon code does not exist.", code="COUPON_INVALID")
    if not promotion.is_active:
        raise ValidationAppError("This coupon is not active.", code="COUPON_INVALID")

    today = date.today()
    if today < promotion.start_date or today > promotion.end_date:
        raise ValidationAppError("This coupon is not within its valid date range.", code="COUPON_INVALID")

    if promotion.usage_limit is not None and promotion.times_used >= promotion.usage_limit:
        raise ValidationAppError("This coupon has reached its usage limit.", code="COUPON_INVALID")

    if promotion.min_order_amount is not None and order_amount < promotion.min_order_amount:
        raise ValidationAppError(
            f"This coupon requires a minimum order amount of {promotion.min_order_amount}.",
            code="COUPON_INVALID",
        )

    return promotion


def _compute_discount(promotion: Promotion, order_amount: Decimal) -> Decimal:
    if promotion.discount_type == DiscountType.percentage:
        discount = order_amount * (promotion.discount_value / Decimal("100"))
    else:
        discount = promotion.discount_value

    if promotion.max_discount_amount is not None:
        discount = min(discount, promotion.max_discount_amount)
    return min(discount, order_amount)


async def calculate_discount(db: AsyncSession, code: str, order_amount: Decimal) -> Decimal:
    promotion = await _get_active_valid_promotion(db, code, order_amount)
    return _compute_discount(promotion, order_amount)


async def apply_coupon_to_cart(db, cart, code: str, subtotal: Decimal) -> None:
    if cart.coupon_code is not None:
        raise ConflictError("A coupon is already applied to this order; only one coupon may be used at a time.")
    await calculate_discount(db, code, subtotal)  # validates; raises if invalid
    cart.coupon_code = code
    await db.commit()


async def remove_coupon_from_cart(db, cart) -> None:
    cart.coupon_code = None
    await db.commit()


async def record_coupon_usage(db: AsyncSession, code: str) -> None:
    result = await db.execute(select(Promotion).where(Promotion.code == code))
    promotion = result.scalar_one_or_none()
    if promotion is not None:
        promotion.times_used += 1


async def list_promotions(db: AsyncSession) -> list[Promotion]:
    result = await db.execute(select(Promotion))
    return list(result.scalars().all())


async def create_promotion(db: AsyncSession, data: CreatePromotionRequest) -> Promotion:
    existing = await db.execute(select(Promotion).where(Promotion.code == data.code))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("A promotion with this code already exists.")

    try:
        discount_type = DiscountType(data.discount_type)
    except ValueError as exc:
        raise ValidationAppError(f"Invalid discount_type: {data.discount_type}") from exc

    promotion = Promotion(
        code=data.code,
        discount_type=discount_type,
        discount_value=Decimal(data.discount_value),
        start_date=data.start_date,
        end_date=data.end_date,
        min_order_amount=Decimal(data.min_order_amount) if data.min_order_amount else None,
        max_discount_amount=Decimal(data.max_discount_amount) if data.max_discount_amount else None,
        usage_limit=data.usage_limit,
    )
    db.add(promotion)
    await db.commit()
    return promotion


async def update_promotion(db: AsyncSession, promotion_id: uuid.UUID, data: UpdatePromotionRequest) -> Promotion:
    result = await db.execute(select(Promotion).where(Promotion.id == promotion_id))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise NotFoundError("The requested promotion was not found.")

    if data.is_active is not None:
        promotion.is_active = data.is_active
    if data.end_date is not None:
        promotion.end_date = data.end_date
    if data.usage_limit is not None:
        promotion.usage_limit = data.usage_limit

    await db.commit()
    return promotion


async def deactivate_promotion(db: AsyncSession, promotion_id: uuid.UUID) -> None:
    result = await db.execute(select(Promotion).where(Promotion.id == promotion_id))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise NotFoundError("The requested promotion was not found.")
    promotion.is_active = False
    await db.commit()
