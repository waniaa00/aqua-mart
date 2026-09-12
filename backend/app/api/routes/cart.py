import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.cart import CartItemRequest, CartResponse, UpdateCartItemRequest
from app.schemas.promotion import ApplyCouponRequest
from app.services import cart_service, promotion_service

router = APIRouter(prefix="/cart", tags=["cart"])


def _effective_currency(currency: str | None, user: User) -> str | None:
    return currency or user.preferred_currency.value


@router.get("", response_model=CartResponse)
async def get_cart_route(
    currency: str | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> CartResponse:
    return await cart_service.get_cart(db, user.id, _effective_currency(currency, user))


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
async def add_item_route(
    data: CartItemRequest,
    currency: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CartResponse:
    return await cart_service.add_item(
        db, user.id, uuid.UUID(data.product_id), data.quantity, _effective_currency(currency, user)
    )


@router.patch("/items/{product_id}", response_model=CartResponse)
async def update_item_route(
    product_id: str,
    data: UpdateCartItemRequest,
    currency: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CartResponse:
    return await cart_service.update_item(
        db, user.id, uuid.UUID(product_id), data.quantity, _effective_currency(currency, user)
    )


@router.delete("/items/{product_id}", response_model=CartResponse)
async def remove_item_route(
    product_id: str,
    currency: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CartResponse:
    return await cart_service.remove_item(db, user.id, uuid.UUID(product_id), _effective_currency(currency, user))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart_route(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> None:
    await cart_service.clear_cart(db, user.id)


@router.post("/coupon", response_model=CartResponse)
async def apply_coupon_route(
    data: ApplyCouponRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> CartResponse:
    cart = await cart_service.get_or_create_cart(db, user.id)
    current = await cart_service.compute_totals(db, cart)
    subtotal = Decimal(current.subtotal.base_price)
    await promotion_service.apply_coupon_to_cart(db, cart, data.code, subtotal)
    return await cart_service.get_cart(db, user.id)


@router.delete("/coupon", response_model=CartResponse)
async def remove_coupon_route(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> CartResponse:
    cart = await cart_service.get_or_create_cart(db, user.id)
    await promotion_service.remove_coupon_from_cart(db, cart)
    return await cart_service.get_cart(db, user.id)
