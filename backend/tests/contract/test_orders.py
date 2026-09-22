import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Order Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _create_product(client, headers, **overrides) -> dict:
    payload = {"name": "Order Product", "slug": "order-product", "sku": "SKU-ORD1", "base_price": "20.00", "product_type": "equipment", "initial_stock_quantity": 10}
    payload.update(overrides)
    resp = await client.post("/api/v1/products", json=payload, headers=headers)
    product = resp.json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=headers)
    return product


async def _customer_headers(client, email) -> dict:
    await client.post("/api/v1/auth/register", json={"name": "Order Cust", "email": email, "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "custpass1"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _create_address(client, headers) -> str:
    resp = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "Order Cust", "phone": "555-0100", "address_line": "1 Order St", "city": "Ordertown", "postal_code": "11111", "country": "US"},
        headers=headers,
    )
    return resp.json()["id"]


@pytest.mark.usefixtures("override_get_db")
async def test_checkout_creates_order_and_decrements_stock_and_clears_cart(client, db_session):
    admin_token = await _register_admin(client, db_session, "orderadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = await _create_product(client, admin_headers, slug="order-product-1", sku="SKU-ORD-A", initial_stock_quantity=5)

    headers = await _customer_headers(client, "ordercust1@example.com")
    address_id = await _create_address(client, headers)
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)

    checkout = await client.post("/api/v1/orders", json={"address_id": address_id}, headers=headers)
    assert checkout.status_code == 201
    order = checkout.json()
    assert order["status"] == "pending"
    assert order["total"]["display_price"] == "40.00"
    assert len(order["items"]) == 1

    cart_after = await client.get("/api/v1/cart", headers=headers)
    assert cart_after.json()["items"] == []

    detail = await client.get("/api/v1/products/order-product-1")
    assert detail.json()["stock_quantity"] == 3

    history = await client.get("/api/v1/orders", headers=headers)
    assert history.json()["total_items"] == 1

    fetched = await client.get(f"/api/v1/orders/{order['id']}", headers=headers)
    assert fetched.status_code == 200


@pytest.mark.usefixtures("override_get_db")
async def test_customer_cannot_see_another_customers_order(client, db_session):
    admin_token = await _register_admin(client, db_session, "orderadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = await _create_product(client, admin_headers, slug="order-product-2", sku="SKU-ORD-B")

    headers_a = await _customer_headers(client, "ordercusta@example.com")
    address_a = await _create_address(client, headers_a)
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers_a)
    order_a = (await client.post("/api/v1/orders", json={"address_id": address_a}, headers=headers_a)).json()

    headers_b = await _customer_headers(client, "ordercustb@example.com")
    forbidden = await client.get(f"/api/v1/orders/{order_a['id']}", headers=headers_b)
    assert forbidden.status_code == 404


@pytest.mark.usefixtures("override_get_db")
async def test_admin_can_update_order_status_and_customer_sees_it(client, db_session):
    admin_token = await _register_admin(client, db_session, "orderadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = await _create_product(client, admin_headers, slug="order-product-3", sku="SKU-ORD-C")

    headers = await _customer_headers(client, "ordercust3@example.com")
    address_id = await _create_address(client, headers)
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address_id}, headers=headers)).json()

    invalid_transition = await client.patch(f"/api/v1/admin/orders/{order['id']}/status", json={"status": "completed"}, headers=admin_headers)
    assert invalid_transition.status_code == 400

    confirmed = await client.patch(f"/api/v1/admin/orders/{order['id']}/status", json={"status": "confirmed"}, headers=admin_headers)
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"

    seen_by_customer = await client.get(f"/api/v1/orders/{order['id']}", headers=headers)
    assert seen_by_customer.json()["status"] == "confirmed"
