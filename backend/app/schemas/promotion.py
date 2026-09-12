from datetime import date

from app.schemas.common import ORMModel


class ApplyCouponRequest(ORMModel):
    code: str


class PromotionResponse(ORMModel):
    id: str
    code: str
    discount_type: str
    discount_value: str
    start_date: date
    end_date: date
    min_order_amount: str | None
    max_discount_amount: str | None
    usage_limit: int | None
    times_used: int
    is_active: bool


class CreatePromotionRequest(ORMModel):
    code: str
    discount_type: str
    discount_value: str
    start_date: date
    end_date: date
    min_order_amount: str | None = None
    max_discount_amount: str | None = None
    usage_limit: int | None = None


class UpdatePromotionRequest(ORMModel):
    is_active: bool | None = None
    end_date: date | None = None
    usage_limit: int | None = None
