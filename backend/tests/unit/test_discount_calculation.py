from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.core.exceptions import ValidationAppError
from app.db.models.promotion import DiscountType, Promotion
from app.services import promotion_service


async def _seed_promotion(db_session, **overrides) -> Promotion:
    defaults = dict(
        code="TESTCODE",
        discount_type=DiscountType.percentage,
        discount_value=Decimal("10"),
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=1),
        is_active=True,
        times_used=0,
    )
    defaults.update(overrides)
    promotion = Promotion(**defaults)
    db_session.add(promotion)
    await db_session.commit()
    return promotion


async def test_percentage_discount_capped_by_max(db_session):
    await _seed_promotion(db_session, discount_value=Decimal("50"), max_discount_amount=Decimal("10"))
    discount = await promotion_service.calculate_discount(db_session, "TESTCODE", Decimal("100"))
    assert discount == Decimal("10")


async def test_fixed_discount_never_exceeds_order_amount(db_session):
    await _seed_promotion(db_session, discount_type=DiscountType.fixed, discount_value=Decimal("50"))
    discount = await promotion_service.calculate_discount(db_session, "TESTCODE", Decimal("20"))
    assert discount == Decimal("20")


async def test_inactive_promotion_rejected(db_session):
    await _seed_promotion(db_session, is_active=False)
    with pytest.raises(ValidationAppError):
        await promotion_service.calculate_discount(db_session, "TESTCODE", Decimal("100"))


async def test_usage_limit_exhausted_rejected(db_session):
    await _seed_promotion(db_session, usage_limit=1, times_used=1)
    with pytest.raises(ValidationAppError):
        await promotion_service.calculate_discount(db_session, "TESTCODE", Decimal("100"))
