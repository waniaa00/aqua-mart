from datetime import datetime

from pydantic import Field

from app.schemas.common import ORMModel


class CreateReviewRequest(ORMModel):
    order_item_id: str
    rating: int = Field(ge=1, le=5)
    review_text: str = ""


class ReviewResponse(ORMModel):
    id: str
    user_id: str
    product_id: str
    rating: int
    review_text: str
    created_at: datetime
