import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationAppError
from app.db.models.address import Address
from app.db.models.cart import Cart
from app.db.models.order import ORDER_STATUS_TRANSITIONS, Order, OrderItem, OrderStatus
from app.db.models.product import Product
from app.schemas.common import PaginatedResponse
from app.schemas.order import OrderItemResponse, OrderResponse
from app.services import inventory_service, notification_service, promotion_service
from app.services.product_service import build_money
from app.utils.pagination import clean_page_params, total_pages as compute_total_pages


async def order_to_response(order: Order, currency: str) -> OrderResponse:
    return OrderResponse(
        id=str(order.id),
        status=order.status.value,
        currency=order.currency,
        subtotal=await _money_same(order.subtotal, order.currency),
        discount_amount=await _money_same(order.discount_amount, order.currency),
        total=await _money_same(order.total, order.currency),
        coupon_code=order.coupon_code,
        items=[
            OrderItemResponse(
                id=str(item.id),
                product_id=str(item.product_id),
                product_name=item.product_name_snapshot,
                quantity=item.quantity,
                unit_price=await _money_same(item.unit_price_snapshot, order.currency),
            )
            for item in order.items
        ],
        placed_at=order.placed_at,
    )


async def _money_same(amount: Decimal, currency: str):
    from app.schemas.common import Money

    return Money.same_currency(amount, currency)


async def checkout(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID, currency: str) -> OrderResponse:
    address_result = await db.execute(select(Address).where(Address.id == address_id, Address.user_id == user_id))
    address = address_result.scalar_one_or_none()
    if address is None:
        raise NotFoundError("Address not found.")

    cart_result = await db.execute(select(Cart).where(Cart.user_id == user_id).options(selectinload(Cart.items)))
    cart = cart_result.scalar_one_or_none()
    if cart is None or not cart.items:
        raise ValidationAppError("Your cart is empty.")

    subtotal = Decimal("0")
    order_items: list[OrderItem] = []
    low_stock_product_ids: list[uuid.UUID] = []
    for item in cart.items:
        product_result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = product_result.scalar_one_or_none()
        if product is None:
            raise ValidationAppError("A product in your cart is no longer available.")

        # Row-locks inventory and raises InsufficientStockError if not enough —
        # the whole transaction rolls back on any failure (FR-032/FR-037).
        crossed_threshold = await inventory_service.check_and_reserve_stock(db, product.id, item.quantity)
        if crossed_threshold:
            low_stock_product_ids.append(product.id)

        line_amount = product.base_price * item.quantity
        subtotal += line_amount
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name_snapshot=product.name,
                unit_price_snapshot=product.base_price,
                quantity=item.quantity,
            )
        )

    discount = Decimal("0")
    if cart.coupon_code:
        promotion = await promotion_service.get_active_coupon(db, cart.coupon_code)
        promotion_service.validate_coupon_for_order(promotion, subtotal)
        discount = promotion_service.calculate_discount(promotion, subtotal)
        promotion.times_used += 1

    total = subtotal - discount

    order = Order(
        user_id=user_id,
        status=OrderStatus.pending,
        currency="USD",
        subtotal=subtotal,
        discount_amount=discount,
        total=total,
        coupon_code=cart.coupon_code,
        shipping_address_snapshot={
            "full_name": address.full_name, "phone": address.phone, "address_line": address.address_line,
            "city": address.city, "state_province": address.state_province, "postal_code": address.postal_code,
            "country": address.country, "delivery_instructions": address.delivery_instructions,
        },
    )
    order.items = order_items
    db.add(order)

    for item in list(cart.items):
        await db.delete(item)
    cart.coupon_code = None

    await db.commit()
    await db.refresh(order, attribute_names=["items"])
    # As in cart_service: deleting related rows and committing doesn't sync
    # the parent's already-loaded `items` collection in memory on its own.
    await db.refresh(cart, attribute_names=["items"])

    await notification_service.notify_order_status_changed(db, order)
    for product_id in low_stock_product_ids:
        from app.db.models.product import Inventory

        inv_result = await db.execute(select(Inventory).where(Inventory.product_id == product_id))
        inv = inv_result.scalar_one_or_none()
        if inv is not None:
            await notification_service.notify_low_stock(db, product_id, inv.stock_quantity)

    return await order_to_response(order, currency)


async def list_orders_for_user(db: AsyncSession, user_id: uuid.UUID, page: int, limit: int, currency: str) -> PaginatedResponse[OrderResponse]:
    params = clean_page_params(page, limit)
    total_items = (await db.execute(select(func.count()).select_from(Order).where(Order.user_id == user_id))).scalar_one()
    result = await db.execute(
        select(Order)
        .where(Order.user_id == user_id)
        .options(selectinload(Order.items))
        .order_by(Order.placed_at.desc())
        .offset(params.offset)
        .limit(params.limit)
    )
    orders = list(result.scalars().unique().all())
    items = [await order_to_response(o, currency) for o in orders]
    return PaginatedResponse(items=items, page=params.page, limit=params.limit, total_items=total_items, total_pages=compute_total_pages(total_items, params.limit))


async def get_order_for_user(db: AsyncSession, user_id: uuid.UUID, order_id: uuid.UUID, currency: str) -> OrderResponse:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user_id).options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("Order not found.")
    return await order_to_response(order, currency)


# --- Admin --------------------------------------------------------------------


async def list_orders_admin(db: AsyncSession, status_filter: str | None, page: int, limit: int) -> PaginatedResponse[OrderResponse]:
    params = clean_page_params(page, limit)
    query = select(Order).options(selectinload(Order.items))
    if status_filter:
        query = query.where(Order.status == OrderStatus(status_filter))
    total_items = (await db.execute(select(func.count()).select_from(query.with_only_columns(Order.id).subquery()))).scalar_one()
    result = await db.execute(query.order_by(Order.placed_at.desc()).offset(params.offset).limit(params.limit))
    orders = list(result.scalars().unique().all())
    items = [await order_to_response(o, o.currency) for o in orders]
    return PaginatedResponse(items=items, page=params.page, limit=params.limit, total_items=total_items, total_pages=compute_total_pages(total_items, params.limit))


async def get_order_admin(db: AsyncSession, order_id: uuid.UUID) -> OrderResponse:
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("Order not found.")
    return await order_to_response(order, order.currency)


async def update_order_status(db: AsyncSession, order_id: uuid.UUID, new_status: str) -> OrderResponse:
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("Order not found.")

    target = OrderStatus(new_status)
    allowed = ORDER_STATUS_TRANSITIONS.get(order.status, set())
    if target not in allowed:
        raise ValidationAppError(f"Cannot transition order from {order.status.value} to {target.value}.")

    order.status = target
    await db.commit()
    await notification_service.notify_order_status_changed(db, order)
    return await order_to_response(order, order.currency)


async def cancel_order_admin(db: AsyncSession, order_id: uuid.UUID) -> OrderResponse:
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError("Order not found.")
    if order.status in (OrderStatus.completed, OrderStatus.cancelled):
        raise ValidationAppError(f"Cannot cancel an order that is already {order.status.value}.")

    for item in order.items:
        await inventory_service.restock(db, item.product_id, item.quantity)
    order.status = OrderStatus.cancelled
    await db.commit()
    await notification_service.notify_order_status_changed(db, order)
    return await order_to_response(order, order.currency)
