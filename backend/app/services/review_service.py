import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.review import Review
from app.schemas.review import CreateReviewRequest, ReviewResponse


def _to_response(review: Review) -> ReviewResponse:
    return ReviewResponse(
        id=str(review.id),
        user_id=str(review.user_id),
        product_id=str(review.product_id),
        rating=review.rating,
        review_text=review.review_text,
        created_at=review.created_at,
    )


async def create_review(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, data: CreateReviewRequest) -> ReviewResponse:
    order_item_id = uuid.UUID(data.order_item_id)

    result = await db.execute(
        select(OrderItem, Order).join(Order, Order.id == OrderItem.order_id).where(OrderItem.id == order_item_id)
    )
    row = result.one_or_none()
    if row is None:
        raise ForbiddenError("This purchase does not exist or is not eligible for a review.")

    order_item, order = row
    if order.user_id != user_id or order_item.product_id != product_id:
        raise ForbiddenError("This purchase does not exist or is not eligible for a review.")
    if order.status != OrderStatus.completed:
        raise ForbiddenError("You can only review products from a completed order.")

    existing = await db.execute(
        select(Review).where(Review.user_id == user_id, Review.order_item_id == order_item_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("You have already reviewed this purchase.")

    review = Review(
        user_id=user_id,
        product_id=product_id,
        order_item_id=order_item_id,
        rating=data.rating,
        review_text=data.review_text,
    )
    db.add(review)
    await db.commit()
    return _to_response(review)


async def list_reviews_for_product(db: AsyncSession, product_id: uuid.UUID, *, include_hidden: bool = False) -> list[ReviewResponse]:
    query = select(Review).where(Review.product_id == product_id)
    if not include_hidden:
        query = query.where(Review.is_moderated_hidden.is_(False))
    result = await db.execute(query)
    return [_to_response(r) for r in result.scalars().all()]


async def moderate_review(db: AsyncSession, review_id: uuid.UUID) -> None:
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if review is None:
        raise NotFoundError("The requested review was not found.")
    review.is_moderated_hidden = True
    await db.commit()
