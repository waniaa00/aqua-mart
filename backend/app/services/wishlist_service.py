import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.db.models.product import Product
from app.db.models.wishlist import Wishlist, WishlistItem
from app.schemas.common import Money
from app.schemas.wishlist import WishlistProductResponse


async def get_or_create_wishlist(db: AsyncSession, user_id: uuid.UUID) -> Wishlist:
    result = await db.execute(
        select(Wishlist).options(selectinload(Wishlist.items)).where(Wishlist.user_id == user_id)
    )
    wishlist = result.scalar_one_or_none()
    if wishlist is None:
        wishlist = Wishlist(user_id=user_id)
        db.add(wishlist)
        await db.commit()
        result = await db.execute(
            select(Wishlist).options(selectinload(Wishlist.items)).where(Wishlist.user_id == user_id)
        )
        wishlist = result.scalar_one()
    return wishlist


async def add_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> None:
    wishlist = await get_or_create_wishlist(db, user_id)
    if any(i.product_id == product_id for i in wishlist.items):
        raise ConflictError("This product is already on your wishlist.")

    product_result = await db.execute(select(Product).where(Product.id == product_id))
    if product_result.scalar_one_or_none() is None:
        raise NotFoundError("The requested product was not found.")

    db.add(WishlistItem(wishlist_id=wishlist.id, product_id=product_id))
    await db.commit()


async def remove_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> None:
    wishlist = await get_or_create_wishlist(db, user_id)
    item = next((i for i in wishlist.items if i.product_id == product_id), None)
    if item is not None:
        await db.delete(item)
        await db.commit()


async def check_saved(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> bool:
    wishlist = await get_or_create_wishlist(db, user_id)
    return any(i.product_id == product_id for i in wishlist.items)


async def list_wishlist(db: AsyncSession, user_id: uuid.UUID) -> list[WishlistProductResponse]:
    wishlist = await get_or_create_wishlist(db, user_id)
    responses = []
    for item in wishlist.items:
        result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = result.scalar_one_or_none()
        if product is None:
            continue
        responses.append(
            WishlistProductResponse(
                product_id=str(product.id),
                name=product.name,
                slug=product.slug,
                price=Money.same_currency(product.base_price, product.base_currency),
            )
        )
    return responses
