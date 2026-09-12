from datetime import datetime

from app.schemas.common import Money, ORMModel


class CreateOrderRequest(ORMModel):
    address_id: str


class OrderItemResponse(ORMModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: Money


class OrderResponse(ORMModel):
    id: str
    status: str
    currency: str
    subtotal: Money
    discount_amount: Money
    total: Money
    coupon_code: str | None
    items: list[OrderItemResponse]
    placed_at: datetime


class UpdateOrderStatusRequest(ORMModel):
    status: str
