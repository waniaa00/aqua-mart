import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError
from app.db.models.product import Inventory, Product, ProductStatus


class InsufficientStockError(AppError):
    status_code = 422
    code = "INSUFFICIENT_STOCK"


async def lock_inventory_row(db: AsyncSession, product_id: uuid.UUID) -> Inventory:
    result = await db.execute(select(Inventory).where(Inventory.product_id == product_id).with_for_update())
    inventory = result.scalar_one_or_none()
    if inventory is None:
        raise NotFoundError("Product inventory not found.")
    return inventory


async def check_and_reserve_stock(db: AsyncSession, product_id: uuid.UUID, quantity: int) -> bool:
    """Locks the inventory row and decrements stock, raising if insufficient.
    Caller is responsible for the surrounding transaction/commit. Returns
    True if this decrement crossed the low-stock threshold — the caller
    should fire a low-stock notification AFTER its own commit succeeds,
    never from inside this still-open transaction."""
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    if product is None or product.status not in (ProductStatus.active, ProductStatus.out_of_stock):
        raise NotFoundError("Product not found or not available.")

    inventory = await lock_inventory_row(db, product_id)
    if inventory.stock_quantity < quantity:
        raise InsufficientStockError(f"Only {inventory.stock_quantity} left in stock.")

    was_above_threshold = inventory.stock_quantity > inventory.low_stock_threshold
    inventory.stock_quantity -= quantity
    if inventory.stock_quantity == 0:
        product.status = ProductStatus.out_of_stock

    return was_above_threshold and inventory.stock_quantity <= inventory.low_stock_threshold


async def restock(db: AsyncSession, product_id: uuid.UUID, quantity: int) -> None:
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    inventory = await lock_inventory_row(db, product_id)
    inventory.stock_quantity += quantity
    if product is not None and product.status == ProductStatus.out_of_stock and inventory.stock_quantity > 0:
        product.status = ProductStatus.active
