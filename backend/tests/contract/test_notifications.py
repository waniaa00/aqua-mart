import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Notif Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


@pytest.mark.usefixtures("override_get_db")
async def test_order_status_change_creates_customer_notification(client, db_session):
    admin_token = await _register_admin(client, db_session, "notifadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = (await client.post(
        "/api/v1/products", json={"name": "Notif Product", "slug": "notif-product", "sku": "SKU-NOTIF1", "base_price": "10.00", "product_type": "equipment", "initial_stock_quantity": 5},
        headers=admin_headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=admin_headers)

    await client.post("/api/v1/auth/register", json={"name": "Notif Cust", "email": "notifcust1@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "notifcust1@example.com", "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    address = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "Notif Cust", "phone": "555-0100", "address_line": "1 Notif St", "city": "Notiftown", "postal_code": "44444", "country": "US"},
        headers=headers,
    )
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
    await client.post("/api/v1/orders", json={"address_id": address.json()["id"]}, headers=headers)

    notifications = await client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200
    assert notifications.json()["total_items"] >= 1
    assert any(n["event_type"] == "order_status_changed" for n in notifications.json()["items"])

    first_id = notifications.json()["items"][0]["id"]
    marked = await client.post(f"/api/v1/notifications/{first_id}/read", headers=headers)
    assert marked.status_code == 200


@pytest.mark.usefixtures("override_get_db")
async def test_low_stock_crossing_creates_admin_notification(client, db_session):
    admin_token = await _register_admin(client, db_session, "notifadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = (await client.post(
        "/api/v1/products",
        json={"name": "Low Stock Product", "slug": "low-stock-product", "sku": "SKU-LOW1", "base_price": "10.00", "product_type": "equipment", "initial_stock_quantity": 10, "low_stock_threshold": 5},
        headers=admin_headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=admin_headers)

    await client.patch(f"/api/v1/products/{product['id']}/inventory", json={"stock_quantity": 3}, headers=admin_headers)

    admin_notifications = await client.get("/api/v1/admin/notifications", params={"event_type": "low_stock_alert"}, headers=admin_headers)
    assert admin_notifications.status_code == 200
    assert admin_notifications.json()["total_items"] >= 1


@pytest.mark.usefixtures("override_get_db")
async def test_mark_notification_read(client, db_session):
    admin_token = await _register_admin(client, db_session, "notifadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    await client.post("/api/v1/auth/register", json={"name": "Notif Cust2", "email": "notifcust2@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "notifcust2@example.com", "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    other_login = await client.post("/api/v1/auth/login", json={"email": "notifadmin3@example.com", "password": "adminpass1"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    listing = await client.get("/api/v1/notifications", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["items"] == []
