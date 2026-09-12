import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Notif User", "email": email, "password": "notifpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "notifpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


async def _create_active_product(client, admin_headers, *, name="Notif Product", stock=5, low_stock_threshold=1) -> str:
    create = await client.post(
        "/api/v1/products",
        json={
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "sku": f"SKU-{name.upper().replace(' ', '')}",
            "base_price": "8.00",
            "product_type": "equipment",
            "initial_stock_quantity": stock,
            "low_stock_threshold": low_stock_threshold,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)
    return product_id


@pytest.mark.usefixtures("override_get_db")
async def test_order_status_change_creates_customer_notification(client, db_session):
    admin_token = await _register_and_login(client, "notifadmin1@example.com")
    await _promote_to_admin(db_session, "notifadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers)

    customer_token = await _register_and_login(client, "notifcustomer1@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    address = await client.post(
        "/api/v1/users/me/addresses",
        json={
            "full_name": "Notif Buyer",
            "phone": "555-0300",
            "address_line": "1 Notify Ave",
            "city": "Alerttown",
            "postal_code": "55555",
            "country": "Testland",
        },
        headers=headers,
    )
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address.json()["id"]}, headers=headers)).json()

    await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "confirmed"}, headers=admin_headers
    )

    notifications = await client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200
    assert any(n["event_type"] == "order_status_changed" for n in notifications.json())


@pytest.mark.usefixtures("override_get_db")
async def test_low_stock_crossing_creates_admin_notification(client, db_session):
    admin_token = await _register_and_login(client, "notifadmin2@example.com")
    await _promote_to_admin(db_session, "notifadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Low Stock Notif", stock=5, low_stock_threshold=3)

    non_admin_check = await client.get("/api/v1/admin/notifications")
    assert non_admin_check.status_code == 401

    await client.patch(f"/api/v1/products/{product_id}/inventory", json={"adjust_by": -3}, headers=admin_headers)

    admin_notifications = await client.get("/api/v1/admin/notifications", headers=admin_headers)
    assert admin_notifications.status_code == 200
    assert any(n["event_type"] == "low_stock_alert" for n in admin_notifications.json())


@pytest.mark.usefixtures("override_get_db")
async def test_mark_notification_read(client, db_session):
    admin_token = await _register_and_login(client, "notifadmin3@example.com")
    await _promote_to_admin(db_session, "notifadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Read Notif Product")

    customer_token = await _register_and_login(client, "notifcustomer3@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    address = await client.post(
        "/api/v1/users/me/addresses",
        json={
            "full_name": "Reader",
            "phone": "555-0400",
            "address_line": "1 Read St",
            "city": "Readtown",
            "postal_code": "66666",
            "country": "Testland",
        },
        headers=headers,
    )
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address.json()["id"]}, headers=headers)).json()
    await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "confirmed"}, headers=admin_headers
    )

    notifications = (await client.get("/api/v1/notifications", headers=headers)).json()
    notification_id = notifications[0]["id"]

    mark_read = await client.post(f"/api/v1/notifications/{notification_id}/read", headers=headers)
    assert mark_read.status_code == 200
