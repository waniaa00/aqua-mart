import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import InsufficientStockError, NotFoundError, ValidationAppError
from app.db.models.cart import Cart, CartItem
from app.db.models.product import Product, ProductStatus
from app.schemas.cart import CartItemResponse, CartResponse
from app.utils.money import round_money


async def get_or_create_cart(db: AsyncSession, user_id: uuid.UUID) -> Cart:
    result = await db.execute(
        select(Cart).options(selectinload(Cart.items)).where(Cart.user_id == user_id)
    )
    cart = result.scalar_one_or_none()
    if cart is None:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.commit()
        result = await db.execute(
            select(Cart).options(selectinload(Cart.items)).where(Cart.user_id == user_id)
        )
        cart = result.scalar_one()
    return cart


async def _get_purchasable_product(db: AsyncSession, product_id: uuid.UUID) -> Product:
    result = await db.execute(
        select(Product).options(selectinload(Product.inventory)).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise NotFoundError("The requested product was not found.")
    return product


def _assert_purchasable(product: Product, quantity: int) -> None:
    if product.status != ProductStatus.active:
        raise ValidationAppError("This product is not currently available for purchase.")
    stock = product.inventory.stock_quantity if product.inventory else 0
    if quantity > stock:
        raise InsufficientStockError("Insufficient stock for the requested quantity.")


async def add_item(
    db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, quantity: int, currency: str | None = None
) -> CartResponse:
    cart = await get_or_create_cart(db, user_id)
    product = await _get_purchasable_product(db, product_id)

    existing = next((i for i in cart.items if i.product_id == product_id), None)
    new_quantity = quantity + (existing.quantity if existing else 0)
    _assert_purchasable(product, new_quantity)

    if existing:
        existing.quantity = new_quantity
    else:
        new_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
        cart.items.append(new_item)

    await db.commit()
    return await compute_totals(db, cart, currency)


async def update_item(
    db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, quantity: int, currency: str | None = None
) -> CartResponse:
    cart = await get_or_create_cart(db, user_id)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if item is None:
        raise NotFoundError("This product is not in your cart.")

    product = await _get_purchasable_product(db, product_id)
    _assert_purchasable(product, quantity)

    item.quantity = quantity
    await db.commit()
    return await compute_totals(db, cart, currency)


async def remove_item(
    db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, currency: str | None = None
) -> CartResponse:
    cart = await get_or_create_cart(db, user_id)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if item is not None:
        cart.items.remove(item)
        await db.delete(item)
        await db.commit()
    return await compute_totals(db, cart, currency)


async def clear_cart(db: AsyncSession, user_id: uuid.UUID) -> None:
    cart = await get_or_create_cart(db, user_id)
    for item in list(cart.items):
        cart.items.remove(item)
        await db.delete(item)
    cart.coupon_code = None
    await db.commit()


async def get_cart(db: AsyncSession, user_id: uuid.UUID, currency: str | None = None) -> CartResponse:
    cart = await get_or_create_cart(db, user_id)
    return await compute_totals(db, cart, currency)


async def compute_totals(db: AsyncSession, cart: Cart, currency: str | None = None) -> CartResponse:
    from app.services import currency_service, promotion_service  # avoid circular imports

    target = currency_service.validate_currency(currency) if currency else "USD"

    items: list[CartItemResponse] = []
    subtotal = Decimal("0")

    for cart_item in cart.items:
        result = await db.execute(select(Product).where(Product.id == cart_item.product_id))
        product = result.scalar_one_or_none()
        if product is None:
            continue
        line_total = product.base_price * cart_item.quantity
        subtotal += line_total
        items.append(
            CartItemResponse(
                product_id=str(product.id),
                product_name=product.name,
                quantity=cart_item.quantity,
                unit_price=await currency_service.convert(db, product.base_price, product.base_currency, target),
                line_total=await currency_service.convert(db, round_money(line_total), product.base_currency, target),
            )
        )

    discount_amount = Decimal("0")
    if cart.coupon_code:
        try:
            discount_amount = await promotion_service.calculate_discount(db, cart.coupon_code, subtotal)
        except ValidationAppError:
            # Coupon no longer qualifies (e.g. cart changed since it was applied) — drop it silently.
            cart.coupon_code = None
            await db.commit()
            discount_amount = Decimal("0")

    total = subtotal - discount_amount

    return CartResponse(
        items=items,
        subtotal=await currency_service.convert(db, round_money(subtotal), "USD", target),
        discount_amount=await currency_service.convert(db, round_money(discount_amount), "USD", target),
        total=await currency_service.convert(db, round_money(total), "USD", target),
        currency=target,
        coupon_code=cart.coupon_code,
    )
