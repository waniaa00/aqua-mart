import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationAppError
from app.db.models.address import Address
from app.db.models.cart import Cart
from app.db.models.order import ORDER_STATUS_TRANSITIONS, Order, OrderItem, OrderStatus
from app.db.models.product import Product
from app.schemas.common import Money
from app.schemas.order import OrderItemResponse, OrderResponse
from app.services import inventory_service, notification_service, promotion_service
from app.utils.money import round_money


def _to_order_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=str(order.id),
        status=order.status.value,
        currency=order.currency,
        subtotal=Money.same_currency(order.subtotal, order.currency),
        discount_amount=Money.same_currency(order.discount_amount, order.currency),
        total=Money.same_currency(order.total, order.currency),
        coupon_code=order.coupon_code,
        items=[
            OrderItemResponse(
                product_id=str(item.product_id),
                product_name=item.product_name_snapshot,
                quantity=item.quantity,
                unit_price=Money.same_currency(item.unit_price_snapshot, order.currency),
            )
            for item in order.items
        ],
        placed_at=order.placed_at,
    )


async def checkout(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> OrderResponse:
    address_result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    )
    address = address_result.scalar_one_or_none()
    if address is None:
        raise NotFoundError("The requested address was not found.")

    cart_result = await db.execute(
        select(Cart).options(selectinload(Cart.items)).where(Cart.user_id == user_id)
    )
    cart = cart_result.scalar_one_or_none()
    if cart is None or not cart.items:
        raise ValidationAppError("Your cart is empty.")

    subtotal = Decimal("0")
    order_items: list[OrderItem] = []

    for cart_item in cart.items:
        product_result = await db.execute(select(Product).where(Product.id == cart_item.product_id))
        product = product_result.scalar_one_or_none()
        if product is None:
            raise NotFoundError("A product in your cart is no longer available.")

        # Row-locks and decrements inventory; raises InsufficientStockError if not enough stock.
        await inventory_service.check_and_reserve_stock(db, product.id, cart_item.quantity)

        line_total = product.base_price * cart_item.quantity
        subtotal += line_total
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name_snapshot=product.name,
                unit_price_snapshot=product.base_price,
                quantity=cart_item.quantity,
            )
        )

    discount_amount = Decimal("0")
    coupon_code = cart.coupon_code
    if coupon_code:
        discount_amount = await promotion_service.calculate_discount(db, coupon_code, subtotal)

    total = subtotal - discount_amount

    order = Order(
        user_id=user_id,
        status=OrderStatus.pending,
        currency="USD",
        subtotal=round_money(subtotal),
        discount_amount=round_money(discount_amount),
        total=round_money(total),
        coupon_code=coupon_code,
        shipping_address_snapshot={
            "full_name": address.full_name,
            "phone": address.phone,
            "address_line": address.address_line,
            "city": address.city,
            "state_province": address.state_province,
            "postal_code": address.postal_code,
            "country": address.country,
            "delivery_instructions": address.delivery_instructions,
        },
    )
    order.items = order_items
    db.add(order)

    if coupon_code:
        await promotion_service.record_coupon_usage(db, coupon_code)

    for cart_item in list(cart.items):
        cart.items.remove(cart_item)
        await db.delete(cart_item)
    cart.coupon_code = None

    await db.commit()
    await db.refresh(order, attribute_names=["items"])

    return _to_order_response(order)


async def list_orders_for_user(db: AsyncSession, user_id: uuid.UUID, *, page: int, limit: int):
    from app.utils.pagination import select_count

    query = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user_id)
        .order_by(Order.placed_at.desc())
    )
    total_items = (await db.execute(select_count(query))).scalar_one()
    rows = (await db.execute(query.offset((page - 1) * limit).limit(limit))).scalars().all()

    import math

    from app.schemas.common import PaginatedResponse

    return PaginatedResponse(
        items=[_to_order_response(o) for o in rows],
        page=page,
        limit=limit,
        total_items=total_items,
        total_pages=math.ceil(total_items / limit) if total_items else 0,
    )


async def get_order_for_user(db: AsyncSession, user_id: uuid.UUID, order_id: uuid.UUID) -> OrderResponse:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.user_id == user_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("The requested order was not found.")
    return _to_order_response(order)


async def list_orders_admin(db: AsyncSession, *, status: str | None, search: str | None, page: int, limit: int):
    import math

    from app.schemas.common import PaginatedResponse
    from app.utils.pagination import select_count

    query = select(Order).options(selectinload(Order.items)).order_by(Order.placed_at.desc())
    if status:
        try:
            query = query.where(Order.status == OrderStatus(status))
        except ValueError as exc:
            raise ValidationAppError(f"Invalid status: {status}") from exc

    total_items = (await db.execute(select_count(query))).scalar_one()
    rows = (await db.execute(query.offset((page - 1) * limit).limit(limit))).scalars().all()

    return PaginatedResponse(
        items=[_to_order_response(o) for o in rows],
        page=page,
        limit=limit,
        total_items=total_items,
        total_pages=math.ceil(total_items / limit) if total_items else 0,
    )


async def get_order_admin(db: AsyncSession, order_id: uuid.UUID) -> OrderResponse:
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("The requested order was not found.")
    return _to_order_response(order)


async def update_order_status(db: AsyncSession, order_id: uuid.UUID, new_status: str) -> OrderResponse:
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("The requested order was not found.")

    try:
        target = OrderStatus(new_status)
    except ValueError as exc:
        raise ValidationAppError(f"Invalid status: {new_status}") from exc

    allowed = ORDER_STATUS_TRANSITIONS.get(order.status, set())
    if target not in allowed:
        raise ValidationAppError(f"Cannot transition order from {order.status.value} to {target.value}.")

    order.status = target
    await db.commit()

    await notification_service.record_event(
        db,
        recipient_user_id=order.user_id,
        event_type="order_status_changed",
        payload={"order_id": str(order.id), "status": target.value},
    )

    return _to_order_response(order)


async def cancel_order_admin(db: AsyncSession, order_id: uuid.UUID) -> OrderResponse:
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("The requested order was not found.")

    if order.status in (OrderStatus.completed, OrderStatus.cancelled):
        raise ValidationAppError(f"Cannot cancel an order that is already {order.status.value}.")

    for item in order.items:
        await inventory_service.restock(db, item.product_id, item.quantity)

    order.status = OrderStatus.cancelled
    await db.commit()

    await notification_service.record_event(
        db,
        recipient_user_id=order.user_id,
        event_type="order_status_changed",
        payload={"order_id": str(order.id), "status": OrderStatus.cancelled.value},
    )

    return _to_order_response(order)
