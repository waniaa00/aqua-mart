from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.db.models.promotion import DiscountType, Promotion
from app.services import promotion_service


def _make_promotion(**overrides) -> Promotion:
    now = datetime.now(timezone.utc)
    defaults = dict(
        code="TESTCODE", discount_type=DiscountType.percentage, discount_value=Decimal("10"),
        start_date=now - timedelta(days=1), end_date=now + timedelta(days=1),
        min_order_amount=None, max_discount_amount=None, usage_limit=None, times_used=0, is_active=True,
    )
    defaults.update(overrides)
    return Promotion(**defaults)


def test_percentage_discount_capped_by_max():
    promo = _make_promotion(discount_type=DiscountType.percentage, discount_value=Decimal("50"), max_discount_amount=Decimal("10"))
    discount = promotion_service.calculate_discount(promo, Decimal("100"))
    assert discount == Decimal("10")  # 50% of 100 = 50, capped to 10


def test_fixed_discount_never_exceeds_order_amount():
    promo = _make_promotion(discount_type=DiscountType.fixed, discount_value=Decimal("50"))
    discount = promotion_service.calculate_discount(promo, Decimal("30"))
    assert discount == Decimal("30")  # can't discount more than the subtotal


def test_inactive_promotion_rejected():
    promo = _make_promotion(is_active=False)
    with pytest.raises(promotion_service.CouponInvalidError):
        promotion_service.validate_coupon_for_order(promo, Decimal("100"))


def test_usage_limit_exhausted_rejected():
    promo = _make_promotion(usage_limit=1, times_used=1)
    with pytest.raises(promotion_service.CouponInvalidError):
        promotion_service.validate_coupon_for_order(promo, Decimal("100"))
