import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError
from app.db.models.product import Product
from app.db.models.wishlist import Wishlist, WishlistItem
from app.schemas.wishlist import WishlistProductResponse
from app.services.product_service import build_money


async def _get_or_create_wishlist(db: AsyncSession, user_id: uuid.UUID) -> Wishlist:
    result = await db.execute(select(Wishlist).where(Wishlist.user_id == user_id).options(selectinload(Wishlist.items)))
    wishlist = result.scalar_one_or_none()
    if wishlist is None:
        wishlist = Wishlist(user_id=user_id)
        db.add(wishlist)
        await db.commit()
        await db.refresh(wishlist, attribute_names=["items"])
    return wishlist


async def list_wishlist(db: AsyncSession, user_id: uuid.UUID) -> list[WishlistProductResponse]:
    wishlist = await _get_or_create_wishlist(db, user_id)
    items = []
    for wi in wishlist.items:
        product_result = await db.execute(select(Product).where(Product.id == wi.product_id))
        product = product_result.scalar_one_or_none()
        if product is None:
            continue
        items.append(
            WishlistProductResponse(
                product_id=str(product.id), name=product.name, slug=product.slug,
                price=await build_money(db, product.base_price, "USD"),
            )
        )
    return items


async def add_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> None:
    wishlist = await _get_or_create_wishlist(db, user_id)
    if any(i.product_id == product_id for i in wishlist.items):
        raise ConflictError("This product is already on your wishlist.")
    db.add(WishlistItem(wishlist_id=wishlist.id, product_id=product_id))
    await db.commit()
    await db.refresh(wishlist, attribute_names=["items"])


async def remove_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> None:
    wishlist = await _get_or_create_wishlist(db, user_id)
    item = next((i for i in wishlist.items if i.product_id == product_id), None)
    if item is not None:
        await db.delete(item)
        await db.commit()
        await db.refresh(wishlist, attribute_names=["items"])


async def check_saved(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> bool:
    wishlist = await _get_or_create_wishlist(db, user_id)
    return any(i.product_id == product_id for i in wishlist.items)
