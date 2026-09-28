import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Extended Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _create_product(client, headers, **overrides) -> dict:
    payload = {"name": "Ext Product", "slug": "ext-product", "sku": "SKU-EXT1", "base_price": "20.00", "product_type": "equipment", "initial_stock_quantity": 10}
    payload.update(overrides)
    resp = await client.post("/api/v1/products", json=payload, headers=headers)
    product = resp.json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=headers)
    return product


async def _customer_headers(client, email, name="Ext Cust") -> tuple[dict, str]:
    reg = await client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "custpass1"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}, reg.json()["id"]


async def _create_address(client, headers) -> str:
    resp = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "Ext Cust", "phone": "555-0100", "address_line": "1 Ext St", "city": "Exttown", "postal_code": "11111", "country": "US"},
        headers=headers,
    )
    return resp.json()["id"]


async def _place_order(client, headers, product_id) -> dict:
    address_id = await _create_address(client, headers)
    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)
    resp = await client.post("/api/v1/orders", json={"address_id": address_id}, headers=headers)
    return resp.json()


@pytest.mark.usefixtures("override_get_db")
async def test_admin_orders_response_includes_customer_identity(client, db_session):
    admin_token = await _register_admin(client, db_session, "extadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = await _create_product(client, admin_headers, slug="ext-product-1", sku="SKU-EXT-A")

    headers, _ = await _customer_headers(client, "extcust1@example.com")
    order = await _place_order(client, headers, product["id"])

    listing = await client.get("/api/v1/admin/orders", headers=admin_headers)
    assert listing.status_code == 200
    item = next(i for i in listing.json()["items"] if i["id"] == order["id"])
    assert item["customer_email"] == "extcust1@example.com"
    assert item["customer_name"] == "Ext Cust"


@pytest.mark.usefixtures("override_get_db")
async def test_admin_orders_search_matches_customer_email(client, db_session):
    admin_token = await _register_admin(client, db_session, "extadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = await _create_product(client, admin_headers, slug="ext-product-2", sku="SKU-EXT-B")

    headers, _ = await _customer_headers(client, "findme-extcust2@example.com")
    order = await _place_order(client, headers, product["id"])

    other_headers, _ = await _customer_headers(client, "extcust3@example.com")
    await _place_order(client, other_headers, product["id"])

    found = await client.get("/api/v1/admin/orders", params={"search": "findme-extcust2"}, headers=admin_headers)
    assert found.status_code == 200
    ids = [i["id"] for i in found.json()["items"]]
    assert order["id"] in ids
    assert len(ids) == 1


@pytest.mark.usefixtures("override_get_db")
async def test_admin_orders_customer_id_filter(client, db_session):
    admin_token = await _register_admin(client, db_session, "extadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = await _create_product(client, admin_headers, slug="ext-product-3", sku="SKU-EXT-C")

    headers_a, user_a_id = await _customer_headers(client, "extcust4@example.com")
    order_a = await _place_order(client, headers_a, product["id"])
    headers_b, _ = await _customer_headers(client, "extcust5@example.com")
    await _place_order(client, headers_b, product["id"])

    filtered = await client.get("/api/v1/admin/orders", params={"customer_id": user_a_id}, headers=admin_headers)
    assert filtered.status_code == 200
    ids = [i["id"] for i in filtered.json()["items"]]
    assert ids == [order_a["id"]]


@pytest.mark.usefixtures("override_get_db")
async def test_admin_orders_sort_total_desc(client, db_session):
    admin_token = await _register_admin(client, db_session, "extadmin4@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    cheap = await _create_product(client, admin_headers, slug="ext-product-cheap", sku="SKU-EXT-D", base_price="5.00")
    pricey = await _create_product(client, admin_headers, slug="ext-product-pricey", sku="SKU-EXT-E", base_price="500.00")

    headers, _ = await _customer_headers(client, "extcust6@example.com")
    cheap_order = await _place_order(client, headers, cheap["id"])
    pricey_order = await _place_order(client, headers, pricey["id"])

    sorted_resp = await client.get("/api/v1/admin/orders", params={"sort": "total_desc", "customer_id": (await client.get("/api/v1/users/me", headers=headers)).json()["id"]}, headers=admin_headers)
    ids = [i["id"] for i in sorted_resp.json()["items"]]
    assert ids.index(pricey_order["id"]) < ids.index(cheap_order["id"])


@pytest.mark.usefixtures("override_get_db")
async def test_admin_orders_invalid_sort_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "extadmin5@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.get("/api/v1/admin/orders", params={"sort": "not-a-real-sort"}, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_admin_orders_date_range_filter(client, db_session):
    admin_token = await _register_admin(client, db_session, "extadmin6@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product = await _create_product(client, admin_headers, slug="ext-product-date", sku="SKU-EXT-F")

    headers, _ = await _customer_headers(client, "extcust7@example.com")
    order = await _place_order(client, headers, product["id"])

    from datetime import date, timedelta

    future = (date.today() + timedelta(days=5)).isoformat()
    empty = await client.get("/api/v1/admin/orders", params={"date_from": future}, headers=admin_headers)
    assert empty.status_code == 200
    assert order["id"] not in [i["id"] for i in empty.json()["items"]]

    today = date.today().isoformat()
    present = await client.get("/api/v1/admin/orders", params={"date_from": today, "date_to": today}, headers=admin_headers)
    assert order["id"] in [i["id"] for i in present.json()["items"]]
