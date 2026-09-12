import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Dashboard User", "email": email, "password": "dashboardpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "dashboardpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


@pytest.mark.usefixtures("override_get_db")
async def test_non_admin_cannot_view_dashboard(client):
    token = await _register_and_login(client, "dashboardcustomer@example.com")
    r = await client.get("/api/v1/admin/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


@pytest.mark.usefixtures("override_get_db")
async def test_dashboard_figures_reconcile_with_underlying_data(client, db_session):
    admin_token = await _register_and_login(client, "dashboardadmin@example.com")
    await _promote_to_admin(db_session, "dashboardadmin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Dashboard Product",
            "slug": "dashboard-product",
            "sku": "SKU-DASHBOARD",
            "base_price": "30.00",
            "product_type": "equipment",
            "initial_stock_quantity": 5,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)

    customer_token = await _register_and_login(client, "dashboardbuyer@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    address = await client.post(
        "/api/v1/users/me/addresses",
        json={
            "full_name": "Buyer",
            "phone": "555-0200",
            "address_line": "1 Sales St",
            "city": "Salestown",
            "postal_code": "44444",
            "country": "Testland",
        },
        headers=headers,
    )
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 2}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address.json()["id"]}, headers=headers)).json()

    summary = await client.get("/api/v1/admin/dashboard/summary", headers=admin_headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_orders"] >= 1
    assert body["orders_by_status"]["pending"] >= 1
    assert body["total_products"] >= 1
    assert any(p["product_id"] == product_id for p in body["best_selling_products"])
