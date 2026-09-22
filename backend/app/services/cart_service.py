import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationAppError
from app.db.models.cart import Cart, CartItem
from app.db.models.product import Product, ProductStatus
from app.schemas.cart import CartItemResponse, CartResponse
from app.services import currency_service, promotion_service
from app.services.inventory_service import InsufficientStockError
from app.services.product_service import build_money


async def _get_or_create_cart(db: AsyncSession, user_id: uuid.UUID) -> Cart:
    result = await db.execute(
        select(Cart).where(Cart.user_id == user_id).options(selectinload(Cart.items))
    )
    cart = result.scalar_one_or_none()
    if cart is None:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.commit()
        await db.refresh(cart, attribute_names=["items"])
    return cart


async def _to_response(db: AsyncSession, cart: Cart, currency: str | None) -> CartResponse:
    currency = currency or "USD"
    items: list[CartItemResponse] = []
    subtotal = Decimal("0")

    for item in cart.items:
        product_result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = product_result.scalar_one_or_none()
        if product is None:
            continue
        line_amount = product.base_price * item.quantity
        subtotal += line_amount
        items.append(
            CartItemResponse(
                product_id=str(item.product_id),
                product_name=product.name,
                quantity=item.quantity,
                unit_price=await build_money(db, product.base_price, currency),
                line_total=await build_money(db, line_amount, currency),
            )
        )

    discount = Decimal("0")
    if cart.coupon_code:
        try:
            promotion = await promotion_service.get_active_coupon(db, cart.coupon_code)
            promotion_service.validate_coupon_for_order(promotion, subtotal)
            discount = promotion_service.calculate_discount(promotion, subtotal)
        except Exception:
            # A previously-applied coupon that's since become invalid (e.g.
            # expired) should not crash cart reads — just stop discounting.
            discount = Decimal("0")

    total = subtotal - discount
    return CartResponse(
        items=items,
        subtotal=await build_money(db, subtotal, currency),
        discount_amount=await build_money(db, discount, currency),
        total=await build_money(db, total, currency),
        currency=currency,
        coupon_code=cart.coupon_code,
    )


async def get_cart(db: AsyncSession, user_id: uuid.UUID, currency: str | None) -> CartResponse:
    cart = await _get_or_create_cart(db, user_id)
    return await _to_response(db, cart, currency)


async def _validate_stock(db: AsyncSession, product_id: uuid.UUID, quantity: int) -> Product:
    result = await db.execute(select(Product).where(Product.id == product_id).options(selectinload(Product.inventory)))
    product = result.scalar_one_or_none()
    if product is None or product.status not in (ProductStatus.active, ProductStatus.out_of_stock):
        raise NotFoundError("Product not found.")
    stock = product.inventory.stock_quantity if product.inventory else 0
    if quantity > stock:
        raise InsufficientStockError(f"Only {stock} left in stock.")
    return product


async def add_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, quantity: int, currency: str | None) -> CartResponse:
    if quantity <= 0:
        raise ValidationAppError("Quantity must be positive.")
    cart = await _get_or_create_cart(db, user_id)

    existing = next((i for i in cart.items if i.product_id == product_id), None)
    new_quantity = (existing.quantity if existing else 0) + quantity
    await _validate_stock(db, product_id, new_quantity)

    if existing:
        existing.quantity = new_quantity
    else:
        db.add(CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity))

    await db.commit()
    # `expire_on_commit=False` + the identity map means a fresh `select()` for
    # this cart would just return this same Python object without reloading
    # its `items` collection — refresh that relationship explicitly instead.
    await db.refresh(cart, attribute_names=["items"])
    return await _to_response(db, cart, currency)


async def update_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, quantity: int, currency: str | None) -> CartResponse:
    if quantity <= 0:
        raise ValidationAppError("Quantity must be positive.")
    cart = await _get_or_create_cart(db, user_id)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if item is None:
        raise NotFoundError("That item is not in your cart.")

    await _validate_stock(db, product_id, quantity)
    item.quantity = quantity
    await db.commit()
    await db.refresh(cart, attribute_names=["items"])
    return await _to_response(db, cart, currency)


async def remove_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, currency: str | None) -> CartResponse:
    cart = await _get_or_create_cart(db, user_id)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if item is not None:
        await db.delete(item)
        await db.commit()
        await db.refresh(cart, attribute_names=["items"])
    return await _to_response(db, cart, currency)


async def clear_cart(db: AsyncSession, user_id: uuid.UUID) -> None:
    cart = await _get_or_create_cart(db, user_id)
    for item in list(cart.items):
        await db.delete(item)
    cart.coupon_code = None
    await db.commit()


async def apply_coupon(db: AsyncSession, user_id: uuid.UUID, code: str, currency: str | None) -> CartResponse:
    cart = await _get_or_create_cart(db, user_id)
    if cart.coupon_code:
        from app.core.exceptions import ConflictError

        raise ConflictError("A coupon is already applied to this cart.")

    current = await _to_response(db, cart, "USD")
    subtotal = Decimal(current.subtotal.base_price)

    promotion = await promotion_service.get_active_coupon(db, code)
    promotion_service.validate_coupon_for_order(promotion, subtotal)

    cart.coupon_code = code
    await db.commit()
    cart = await _get_or_create_cart(db, user_id)
    return await _to_response(db, cart, currency)


async def remove_coupon(db: AsyncSession, user_id: uuid.UUID, currency: str | None) -> CartResponse:
    cart = await _get_or_create_cart(db, user_id)
    cart.coupon_code = None
    await db.commit()
    cart = await _get_or_create_cart(db, user_id)
    return await _to_response(db, cart, currency)
