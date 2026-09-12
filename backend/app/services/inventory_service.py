import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InsufficientStockError, NotFoundError, ValidationAppError
from app.db.models.product import Inventory, Product, ProductStatus
from app.services import notification_service


async def _notify_low_stock(db: AsyncSession, product_id: uuid.UUID, *, commit: bool = False) -> None:
    await notification_service.record_event(
        db,
        recipient_user_id=None,
        event_type="low_stock_alert",
        payload={"product_id": str(product_id)},
        commit=commit,
    )


async def check_and_reserve_stock(db: AsyncSession, product_id: uuid.UUID, quantity: int) -> None:
    """Lock the inventory row and decrement stock by `quantity`.

    Must be called inside an active transaction. Row-level locking (research.md
    §6) makes this safe under concurrent checkouts for the same product.
    """
    result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id).with_for_update()
    )
    inventory = result.scalar_one_or_none()
    if inventory is None:
        raise NotFoundError("The requested product was not found.")
    if inventory.stock_quantity < quantity:
        raise InsufficientStockError("Insufficient stock for the requested quantity.")

    was_above_threshold = inventory.stock_quantity > inventory.low_stock_threshold
    inventory.stock_quantity -= quantity
    now_at_or_below_threshold = inventory.stock_quantity <= inventory.low_stock_threshold

    if inventory.stock_quantity <= 0:
        product_result = await db.execute(select(Product).where(Product.id == product_id))
        product = product_result.scalar_one_or_none()
        if product is not None and product.status == ProductStatus.active:
            product.status = ProductStatus.out_of_stock

    if was_above_threshold and now_at_or_below_threshold:
        await _notify_low_stock(db, product_id)


async def restock(db: AsyncSession, product_id: uuid.UUID, quantity: int) -> None:
    result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id).with_for_update()
    )
    inventory = result.scalar_one_or_none()
    if inventory is None:
        raise NotFoundError("The requested product was not found.")
    inventory.stock_quantity += quantity

    if inventory.stock_quantity > 0:
        product_result = await db.execute(select(Product).where(Product.id == product_id))
        product = product_result.scalar_one_or_none()
        if product is not None and product.status == ProductStatus.out_of_stock:
            product.status = ProductStatus.active


async def adjust_stock(
    db: AsyncSession,
    product_id: uuid.UUID,
    *,
    stock_quantity: int | None = None,
    low_stock_threshold: int | None = None,
    adjust_by: int | None = None,
) -> dict:
    result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id).with_for_update()
    )
    inventory = result.scalar_one_or_none()
    if inventory is None:
        raise NotFoundError("The requested product was not found.")

    was_above_threshold = inventory.stock_quantity > inventory.low_stock_threshold

    if stock_quantity is not None:
        inventory.stock_quantity = stock_quantity
    if adjust_by is not None:
        inventory.stock_quantity += adjust_by
    if low_stock_threshold is not None:
        inventory.low_stock_threshold = low_stock_threshold

    if inventory.stock_quantity < 0:
        raise ValidationAppError("Stock quantity cannot be negative.")

    now_at_or_below_threshold = inventory.stock_quantity <= inventory.low_stock_threshold

    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    if product is not None:
        if inventory.stock_quantity <= 0 and product.status == ProductStatus.active:
            product.status = ProductStatus.out_of_stock
        elif inventory.stock_quantity > 0 and product.status == ProductStatus.out_of_stock:
            product.status = ProductStatus.active

    if was_above_threshold and now_at_or_below_threshold:
        await _notify_low_stock(db, product_id, commit=False)

    await db.commit()

    is_low_stock = inventory.stock_quantity <= inventory.low_stock_threshold

    return {
        "stock_quantity": inventory.stock_quantity,
        "low_stock_threshold": inventory.low_stock_threshold,
        "status": product.status.value if product else None,
        "is_low_stock": is_low_stock,
    }
