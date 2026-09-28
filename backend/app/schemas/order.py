from datetime import datetime

from app.schemas.common import Money, ORMModel


class CreateOrderRequest(ORMModel):
    address_id: str


class OrderItemResponse(ORMModel):
    id: str
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


class AdminOrderListItem(OrderResponse):
    # Extends OrderResponse (unchanged for the customer-facing endpoint)
    # with the owning customer's identity and shipping address — needed
    # for FR-013's "customer" column, the `search`/`customer_id` filters,
    # and the admin order-detail drawer (T032). Admin-only response; never
    # used on the customer's own /orders route.
    user_id: str
    customer_email: str
    customer_name: str
    shipping_address: dict
