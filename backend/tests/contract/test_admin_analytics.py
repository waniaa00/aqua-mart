import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Analytics Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _create_confirmed_order(client, admin_headers, customer_email, price) -> dict:
    slug_id = customer_email.split("@")[0]
    product = (await client.post(
        "/api/v1/products",
        json={"name": "Analytics Product", "slug": f"analytics-{slug_id}", "sku": f"SKU-{slug_id}", "base_price": price, "product_type": "equipment", "initial_stock_quantity": 10},
        headers=admin_headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=admin_headers)

    await client.post("/api/v1/auth/register", json={"name": "Analytics Cust", "email": customer_email, "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": customer_email, "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    address = (await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "Analytics Cust", "phone": "555-0100", "address_line": "1 Analytics St", "city": "Analyticston", "postal_code": "55555", "country": "US"},
        headers=headers,
    )).json()
    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address["id"]}, headers=headers)).json()
    confirmed = await client.patch(f"/api/v1/admin/orders/{order['id']}/status", json={"status": "confirmed"}, headers=admin_headers)
    return confirmed.json()


@pytest.mark.usefixtures("override_get_db")
async def test_non_admin_cannot_view_analytics(client):
    await client.post("/api/v1/auth/register", json={"name": "Not Admin", "email": "notadmin-analytics@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "notadmin-analytics@example.com", "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": "today"}, headers=headers)
    assert resp.status_code == 403


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_today_reconciles_with_a_real_order(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    await _create_confirmed_order(client, admin_headers, "analyticscust1@example.com", "42.00")

    resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": "today", "compare": "none"}, headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["granularity"] == "day"
    assert body["totals"]["order_count"] >= 1
    assert float(body["totals"]["revenue"]) >= 42.0
    assert "comparison" not in body or body["comparison"] is None


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_predefined_ranges_and_granularity(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    for range_param, expected_granularity in [("7d", "day"), ("30d", "day"), ("90d", "week"), ("12mo", "month")]:
        resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": range_param}, headers=admin_headers)
        assert resp.status_code == 200, range_param
        assert resp.json()["granularity"] == expected_granularity, range_param


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_compare_previous_present_by_default(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    await _create_confirmed_order(client, admin_headers, "analyticscust3@example.com", "10.00")

    resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": "7d"}, headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["comparison"] is not None
    assert "previous_totals" in body["comparison"]
    assert "absolute_diff" in body["comparison"]
    assert "percentage_diff" in body["comparison"]


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_custom_range_valid(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin4@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    from datetime import date, timedelta

    start = (date.today() - timedelta(days=10)).isoformat()
    end = date.today().isoformat()
    resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": "custom", "start": start, "end": end}, headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["range"]["start"] == start
    assert body["range"]["end"] == end


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_custom_range_missing_dates_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin5@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": "custom"}, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_custom_range_end_before_start_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin6@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.get(
        "/api/v1/admin/dashboard/analytics", params={"range": "custom", "start": "2026-09-20", "end": "2026-09-10"}, headers=admin_headers
    )
    assert resp.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_custom_range_too_long_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin7@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.get(
        "/api/v1/admin/dashboard/analytics", params={"range": "custom", "start": "2020-01-01", "end": "2026-01-01"}, headers=admin_headers
    )
    assert resp.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_invalid_range_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin8@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": "not-a-range"}, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_invalid_compare_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin9@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.get("/api/v1/admin/dashboard/analytics", params={"range": "today", "compare": "yesterday-only"}, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_analytics_empty_range_returns_zeroed_totals_not_error(client, db_session):
    admin_token = await _register_admin(client, db_session, "analyticsadmin10@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    from datetime import date, timedelta

    # A custom range far enough in the past that no orders exist there.
    start = (date.today() - timedelta(days=3650)).isoformat()
    end = (date.today() - timedelta(days=3649)).isoformat()
    resp = await client.get(
        "/api/v1/admin/dashboard/analytics", params={"range": "custom", "start": start, "end": end, "compare": "none"}, headers=admin_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["series"] == []
    assert body["totals"] == {"revenue": "0.00", "order_count": 0, "average_order_value": "0.00"}
