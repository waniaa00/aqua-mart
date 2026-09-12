from app.schemas.common import Money, ORMModel


class WishlistItemRequest(ORMModel):
    product_id: str


class WishlistProductResponse(ORMModel):
    product_id: str
    name: str
    slug: str
    price: Money
