import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Dash Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


@pytest.mark.usefixtures("override_get_db")
async def test_non_admin_cannot_view_dashboard(client):
    await client.post("/api/v1/auth/register", json={"name": "Dash Cust", "email": "dashcust@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "dashcust@example.com", "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = await client.get("/api/v1/admin/dashboard/summary", headers=headers)
    assert resp.status_code == 403


@pytest.mark.usefixtures("override_get_db")
async def test_dashboard_figures_reconcile_with_underlying_data(client, db_session):
    admin_token = await _register_admin(client, db_session, "dashadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = (await client.post(
        "/api/v1/products", json={"name": "Dashboard Product", "slug": "dashboard-product", "sku": "SKU-DASH1", "base_price": "50.00", "product_type": "equipment", "initial_stock_quantity": 10},
        headers=admin_headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=admin_headers)

    await client.post("/api/v1/auth/register", json={"name": "Dash Cust1", "email": "dashcust1@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "dashcust1@example.com", "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    address = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "Dash Cust1", "phone": "555-0100", "address_line": "1 Dash St", "city": "Dashtown", "postal_code": "55555", "country": "US"},
        headers=headers,
    )
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address.json()["id"]}, headers=headers)).json()
    await client.patch(f"/api/v1/admin/orders/{order['id']}/status", json={"status": "confirmed"}, headers=admin_headers)

    summary = await client.get("/api/v1/admin/dashboard/summary", headers=admin_headers)
    assert summary.status_code == 200
    body = summary.json()

    assert body["total_orders"] >= 1
    assert body["orders_by_status"].get("confirmed", 0) >= 1
    assert float(body["total_sales"]["display_price"]) >= 100.0
    assert any(p["id"] == product["id"] for p in body["best_selling_products"])
    assert body["total_customers"] >= 1
    assert body["total_products"] >= 1
