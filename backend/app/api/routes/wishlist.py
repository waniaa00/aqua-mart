import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.wishlist import WishlistItemRequest, WishlistProductResponse
from app.services import wishlist_service

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[WishlistProductResponse])
async def list_wishlist_route(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[WishlistProductResponse]:
    return await wishlist_service.list_wishlist(db, user.id)


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def add_wishlist_item_route(
    data: WishlistItemRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    await wishlist_service.add_item(db, user.id, uuid.UUID(data.product_id))
    return {"added": True}


@router.delete("/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_wishlist_item_route(
    product_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    await wishlist_service.remove_item(db, user.id, uuid.UUID(product_id))


@router.get("/items/{product_id}")
async def check_wishlist_item_route(
    product_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    saved = await wishlist_service.check_saved(db, user.id, uuid.UUID(product_id))
    return {"saved": saved}
