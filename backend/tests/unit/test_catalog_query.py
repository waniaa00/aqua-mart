import pytest

from app.core.exceptions import ValidationAppError
from app.db.models.product import Inventory, Product, ProductStatus, ProductType
from app.services import product_service


async def _seed_product(db_session, *, name, price, status=ProductStatus.active, product_type=ProductType.equipment):
    product = Product(
        name=name,
        slug=name.lower().replace(" ", "-"),
        sku=f"SKU-{name.upper().replace(' ', '')}",
        base_price=price,
        base_currency="USD",
        product_type=product_type,
        status=status,
    )
    product.inventory = Inventory(stock_quantity=3, low_stock_threshold=1)
    db_session.add(product)
    await db_session.commit()
    return product


async def test_list_products_excludes_non_active_by_default(db_session):
    await _seed_product(db_session, name="Active Filter", price=10, status=ProductStatus.active)
    await _seed_product(db_session, name="Draft Filter", price=10, status=ProductStatus.draft)

    result = await product_service.list_products(db_session)
    names = {item.name for item in result.items}
    assert "Active Filter" in names
    assert "Draft Filter" not in names


async def test_list_products_invalid_sort_raises(db_session):
    with pytest.raises(ValidationAppError):
        await product_service.list_products(db_session, sort="not-a-real-sort")


async def test_list_products_price_range_and_sort(db_session):
    await _seed_product(db_session, name="Cheap Item", price=5)
    await _seed_product(db_session, name="Mid Item", price=15)
    await _seed_product(db_session, name="Pricey Item", price=25)

    result = await product_service.list_products(db_session, min_price=10, max_price=20, sort="price_asc")
    assert [item.name for item in result.items] == ["Mid Item"]
