from datetime import datetime
from decimal import Decimal

from app.schemas.common import ORMModel


class CreatePromotionRequest(ORMModel):
    code: str
    discount_type: str
    discount_value: str
    start_date: datetime
    end_date: datetime
    min_order_amount: str | None = None
    max_discount_amount: str | None = None
    usage_limit: int | None = None


class UpdatePromotionRequest(ORMModel):
    discount_type: str | None = None
    discount_value: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    min_order_amount: str | None = None
    max_discount_amount: str | None = None
    usage_limit: int | None = None
    is_active: bool | None = None


class PromotionResponse(ORMModel):
    id: str
    code: str
    discount_type: str
    discount_value: Decimal
    start_date: datetime
    end_date: datetime
    min_order_amount: Decimal | None
    max_discount_amount: Decimal | None
    usage_limit: int | None
    times_used: int
    is_active: bool


class ApplyCouponRequest(ORMModel):
    code: str
