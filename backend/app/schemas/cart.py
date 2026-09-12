from pydantic import Field

from app.schemas.common import Money, ORMModel


class CartItemRequest(ORMModel):
    product_id: str
    quantity: int = Field(gt=0)


class UpdateCartItemRequest(ORMModel):
    quantity: int = Field(gt=0)


class CartItemResponse(ORMModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: Money
    line_total: Money


class CartResponse(ORMModel):
    items: list[CartItemResponse]
    subtotal: Money
    discount_amount: Money
    total: Money
    currency: str
    coupon_code: str | None = None
