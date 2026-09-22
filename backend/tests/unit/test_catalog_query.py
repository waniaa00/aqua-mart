import pytest

from app.core.exceptions import ValidationAppError
from app.db.models.product import Product, ProductStatus
from app.services import product_service


async def _make_product(db_session, **overrides):
    from decimal import Decimal

    defaults = dict(
        name="Query Product", slug=f"query-product-{overrides.get('sku', 'x')}", sku="SKU-QP", base_price=Decimal("9.99"),
        base_currency="USD", product_type="equipment", status=ProductStatus.active,
    )
    defaults.update(overrides)
    product = Product(**defaults)
    db_session.add(product)
    await db_session.commit()
    return product


@pytest.mark.usefixtures("override_get_db")
async def test_list_products_excludes_non_active_by_default(db_session):
    await _make_product(db_session, sku="SKU-ACTIVE1", slug="active-one", status=ProductStatus.active)
    await _make_product(db_session, sku="SKU-DRAFT1", slug="draft-one", status=ProductStatus.draft)

    result = await product_service.list_products(db_session, search="Query Product")
    slugs = [i.slug for i in result.items]
    assert "active-one" in slugs
    assert "draft-one" not in slugs


@pytest.mark.usefixtures("override_get_db")
async def test_list_products_invalid_sort_raises(db_session):
    with pytest.raises(ValidationAppError):
        await product_service.list_products(db_session, sort="not_a_real_sort")


@pytest.mark.usefixtures("override_get_db")
async def test_list_products_price_range_and_sort(db_session):
    from decimal import Decimal

    await _make_product(db_session, sku="SKU-CHEAP1", slug="cheap-one", base_price=Decimal("5.00"))
    await _make_product(db_session, sku="SKU-MID1", slug="mid-one", base_price=Decimal("15.00"))
    await _make_product(db_session, sku="SKU-EXPENSIVE1", slug="expensive-one", base_price=Decimal("50.00"))

    result = await product_service.list_products(
        db_session, search="Query Product", min_price=Decimal("10"), max_price=Decimal("20"), sort="price_asc"
    )
    slugs = [i.slug for i in result.items]
    assert slugs == ["mid-one"]
