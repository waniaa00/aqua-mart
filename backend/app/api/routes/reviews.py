import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.review import CreateReviewRequest, ReviewResponse
from app.services import review_service

router = APIRouter(tags=["reviews"])


@router.get("/products/{product_id}/reviews", response_model=list[ReviewResponse])
async def list_reviews_route(product_id: str, db: AsyncSession = Depends(get_db)) -> list[ReviewResponse]:
    return await review_service.list_reviews_for_product(db, uuid.UUID(product_id))


@router.post("/products/{product_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review_route(
    product_id: str,
    data: CreateReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    return await review_service.create_review(db, user.id, uuid.UUID(product_id), data)


@router.delete("/admin/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def moderate_review_route(
    review_id: str, db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)
) -> None:
    await review_service.moderate_review(db, uuid.UUID(review_id))
