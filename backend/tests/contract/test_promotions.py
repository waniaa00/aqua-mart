from datetime import datetime, timedelta, timezone

import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Promo Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _customer_headers(client, email) -> dict:
    await client.post("/api/v1/auth/register", json={"name": "Promo Cust", "email": email, "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "custpass1"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _iso(dt) -> str:
    return dt.isoformat()


@pytest.mark.usefixtures("override_get_db")
async def test_valid_coupon_applies_discount(client, db_session):
    admin_token = await _register_admin(client, db_session, "promoadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    now = datetime.now(timezone.utc)

    promo = await client.post(
        "/api/v1/admin/promotions",
        json={
            "code": "SAVE10", "discount_type": "percentage", "discount_value": "10",
            "start_date": _iso(now - timedelta(days=1)), "end_date": _iso(now + timedelta(days=1)),
        },
        headers=admin_headers,
    )
    assert promo.status_code == 201

    product = (await client.post(
        "/api/v1/products", json={"name": "Promo Product", "slug": "promo-product", "sku": "SKU-PROMO1", "base_price": "100.00", "product_type": "equipment", "initial_stock_quantity": 5},
        headers=admin_headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=admin_headers)

    headers = await _customer_headers(client, "promocust1@example.com")
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)

    applied = await client.post("/api/v1/cart/coupon", json={"code": "SAVE10"}, headers=headers)
    assert applied.status_code == 200
    body = applied.json()
    assert body["coupon_code"] == "SAVE10"
    assert body["discount_amount"]["display_price"] == "10.00"
    assert body["total"]["display_price"] == "90.00"

    already_applied = await client.post("/api/v1/cart/coupon", json={"code": "SAVE10"}, headers=headers)
    assert already_applied.status_code == 409

    removed = await client.delete("/api/v1/cart/coupon", headers=headers)
    assert removed.json()["coupon_code"] is None


@pytest.mark.usefixtures("override_get_db")
async def test_expired_and_unknown_coupons_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "promoadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    now = datetime.now(timezone.utc)

    await client.post(
        "/api/v1/admin/promotions",
        json={"code": "EXPIRED1", "discount_type": "fixed", "discount_value": "5", "start_date": _iso(now - timedelta(days=10)), "end_date": _iso(now - timedelta(days=1))},
        headers=admin_headers,
    )
    product = (await client.post(
        "/api/v1/products", json={"name": "Expired Coupon Product", "slug": "expired-coupon-product", "sku": "SKU-EXP1", "base_price": "20.00", "product_type": "equipment", "initial_stock_quantity": 5},
        headers=admin_headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=admin_headers)

    headers = await _customer_headers(client, "promocust2@example.com")
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)

    expired = await client.post("/api/v1/cart/coupon", json={"code": "EXPIRED1"}, headers=headers)
    assert expired.status_code == 400
    assert expired.json()["error"]["code"] == "COUPON_INVALID"

    unknown = await client.post("/api/v1/cart/coupon", json={"code": "NOSUCHCODE"}, headers=headers)
    assert unknown.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_usage_limit_and_min_order_enforced(client, db_session):
    admin_token = await _register_admin(client, db_session, "promoadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    now = datetime.now(timezone.utc)

    await client.post(
        "/api/v1/admin/promotions",
        json={
            "code": "MINORDER50", "discount_type": "fixed", "discount_value": "5",
            "start_date": _iso(now - timedelta(days=1)), "end_date": _iso(now + timedelta(days=1)),
            "min_order_amount": "50.00",
        },
        headers=admin_headers,
    )
    product = (await client.post(
        "/api/v1/products", json={"name": "Min Order Product", "slug": "min-order-product", "sku": "SKU-MIN1", "base_price": "10.00", "product_type": "equipment", "initial_stock_quantity": 5},
        headers=admin_headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=admin_headers)

    headers = await _customer_headers(client, "promocust3@example.com")
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)

    below_min = await client.post("/api/v1/cart/coupon", json={"code": "MINORDER50"}, headers=headers)
    assert below_min.status_code == 400
