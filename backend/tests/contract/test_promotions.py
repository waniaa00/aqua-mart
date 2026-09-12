import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Promo User", "email": email, "password": "promopass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "promopass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


async def _create_active_product(client, admin_headers, *, price="50.00", name="Promo Product") -> str:
    create = await client.post(
        "/api/v1/products",
        json={
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "sku": f"SKU-{name.upper().replace(' ', '')}",
            "base_price": price,
            "product_type": "equipment",
            "initial_stock_quantity": 10,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)
    return product_id


@pytest.mark.usefixtures("override_get_db")
async def test_valid_coupon_applies_discount(client, db_session):
    admin_token = await _register_and_login(client, "promoadmin1@example.com")
    await _promote_to_admin(db_session, "promoadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers)

    await client.post(
        "/api/v1/admin/promotions",
        json={
            "code": "SAVE10",
            "discount_type": "percentage",
            "discount_value": "10",
            "start_date": "2020-01-01",
            "end_date": "2030-01-01",
        },
        headers=admin_headers,
    )

    customer_token = await _register_and_login(client, "promocustomer1@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)

    apply = await client.post("/api/v1/cart/coupon", json={"code": "SAVE10"}, headers=headers)
    assert apply.status_code == 200, apply.text
    assert apply.json()["discount_amount"]["display_price"] == "5.00"
    assert apply.json()["total"]["display_price"] == "45.00"

    # Only one coupon per order
    second = await client.post("/api/v1/cart/coupon", json={"code": "SAVE10"}, headers=headers)
    assert second.status_code == 409


@pytest.mark.usefixtures("override_get_db")
async def test_expired_and_unknown_coupons_rejected(client, db_session):
    admin_token = await _register_and_login(client, "promoadmin2@example.com")
    await _promote_to_admin(db_session, "promoadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Expired Coupon Product")

    await client.post(
        "/api/v1/admin/promotions",
        json={
            "code": "EXPIRED5",
            "discount_type": "fixed",
            "discount_value": "5",
            "start_date": "2020-01-01",
            "end_date": "2020-12-31",
        },
        headers=admin_headers,
    )

    customer_token = await _register_and_login(client, "promocustomer2@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)

    expired = await client.post("/api/v1/cart/coupon", json={"code": "EXPIRED5"}, headers=headers)
    assert expired.status_code == 400
    assert expired.json()["error"]["code"] == "COUPON_INVALID"

    unknown = await client.post("/api/v1/cart/coupon", json={"code": "DOES_NOT_EXIST"}, headers=headers)
    assert unknown.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_usage_limit_and_min_order_enforced(client, db_session):
    admin_token = await _register_and_login(client, "promoadmin3@example.com")
    await _promote_to_admin(db_session, "promoadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, price="5.00", name="Min Order Product")

    await client.post(
        "/api/v1/admin/promotions",
        json={
            "code": "MINORDER",
            "discount_type": "fixed",
            "discount_value": "5",
            "start_date": "2020-01-01",
            "end_date": "2030-01-01",
            "min_order_amount": "100",
        },
        headers=admin_headers,
    )

    customer_token = await _register_and_login(client, "promocustomer3@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)

    below_minimum = await client.post("/api/v1/cart/coupon", json={"code": "MINORDER"}, headers=headers)
    assert below_minimum.status_code == 400
