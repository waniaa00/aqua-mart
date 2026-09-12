import asyncio

import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Order User", "email": email, "password": "orderpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "orderpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


async def _create_active_product(client, admin_headers, *, name, price="9.99", stock=5) -> str:
    create = await client.post(
        "/api/v1/products",
        json={
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "sku": f"SKU-{name.upper().replace(' ', '')}",
            "base_price": price,
            "product_type": "equipment",
            "initial_stock_quantity": stock,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)
    return product_id


async def _create_address(client, headers) -> str:
    r = await client.post(
        "/api/v1/users/me/addresses",
        json={
            "full_name": "Test Customer",
            "phone": "555-0100",
            "address_line": "123 Reef Street",
            "city": "Aquacity",
            "postal_code": "00000",
            "country": "Testland",
        },
        headers=headers,
    )
    return r.json()["id"]


@pytest.mark.usefixtures("override_get_db")
async def test_checkout_creates_order_and_decrements_stock_and_clears_cart(client, db_session):
    admin_token = await _register_and_login(client, "orderadmin1@example.com")
    await _promote_to_admin(db_session, "orderadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Heater", stock=5)

    customer_token = await _register_and_login(client, "ordercustomer1@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    address_id = await _create_address(client, headers)

    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 2}, headers=headers)

    checkout = await client.post("/api/v1/orders", json={"address_id": address_id}, headers=headers)
    assert checkout.status_code == 201, checkout.text
    order = checkout.json()
    assert order["status"] == "pending"
    assert order["total"]["display_price"] == "19.98"
    assert len(order["items"]) == 1
    assert order["items"][0]["quantity"] == 2

    cart_after = await client.get("/api/v1/cart", headers=headers)
    assert cart_after.json()["items"] == []

    detail = await client.get(f"/api/v1/products/heater")
    assert detail.json()["stock_quantity"] == 3

    history = await client.get("/api/v1/orders", headers=headers)
    assert history.json()["total_items"] == 1

    own_order = await client.get(f"/api/v1/orders/{order['id']}", headers=headers)
    assert own_order.status_code == 200


@pytest.mark.usefixtures("override_get_db")
async def test_customer_cannot_see_another_customers_order(client, db_session):
    admin_token = await _register_and_login(client, "orderadmin2@example.com")
    await _promote_to_admin(db_session, "orderadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Air Pump", stock=5)

    token_a = await _register_and_login(client, "ownerA@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    address_a = await _create_address(client, headers_a)
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers_a)
    order = (await client.post("/api/v1/orders", json={"address_id": address_a}, headers=headers_a)).json()

    token_b = await _register_and_login(client, "ownerB@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    forbidden = await client.get(f"/api/v1/orders/{order['id']}", headers=headers_b)
    assert forbidden.status_code == 404


@pytest.mark.usefixtures("override_get_db")
async def test_admin_can_update_order_status_and_customer_sees_it(client, db_session):
    admin_token = await _register_and_login(client, "orderadmin3@example.com")
    await _promote_to_admin(db_session, "orderadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Gravel Bag", stock=5)

    customer_token = await _register_and_login(client, "ordercustomer3@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    address_id = await _create_address(client, headers)
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address_id}, headers=headers)).json()

    non_admin_attempt = await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "confirmed"}, headers=headers
    )
    assert non_admin_attempt.status_code == 403

    updated = await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "confirmed"}, headers=admin_headers
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "confirmed"

    invalid_transition = await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "pending"}, headers=admin_headers
    )
    assert invalid_transition.status_code == 400

    seen_by_customer = await client.get(f"/api/v1/orders/{order['id']}", headers=headers)
    assert seen_by_customer.json()["status"] == "confirmed"


@pytest.mark.usefixtures("override_get_db")
async def test_concurrent_checkout_for_last_unit_only_one_succeeds(client, db_session):
    admin_token = await _register_and_login(client, "orderadmin4@example.com")
    await _promote_to_admin(db_session, "orderadmin4@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Last Unit Filter", stock=1)

    token_a = await _register_and_login(client, "racerA@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    address_a = await _create_address(client, headers_a)
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers_a)

    token_b = await _register_and_login(client, "racerB@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    address_b = await _create_address(client, headers_b)
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers_b)

    results = await asyncio.gather(
        client.post("/api/v1/orders", json={"address_id": address_a}, headers=headers_a),
        client.post("/api/v1/orders", json={"address_id": address_b}, headers=headers_b),
        return_exceptions=True,
    )

    statuses = sorted(r.status_code for r in results if not isinstance(r, Exception))
    assert statuses == [201, 422], f"Expected exactly one success and one insufficient-stock rejection, got {statuses}"
