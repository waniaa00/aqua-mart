import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Cat Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _create_product(client, headers, **overrides) -> dict:
    payload = {
        "name": "Neon Tetra",
        "slug": "neon-tetra-test",
        "sku": "SKU-NEON1",
        "base_price": "4.99",
        "product_type": "fish",
        "initial_stock_quantity": 10,
        "fish_details": {"species": "Paracheirodon innesi", "freshwater_or_marine": "freshwater", "difficulty": "easy"},
    }
    payload.update(overrides)
    resp = await client.post("/api/v1/products", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    product = resp.json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=headers)
    return product


@pytest.mark.usefixtures("override_get_db")
async def test_non_admin_cannot_create_product(client):
    await client.post("/api/v1/auth/register", json={"name": "Cust", "email": "catcust@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "catcust@example.com", "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = await client.post(
        "/api/v1/products",
        json={"name": "X", "slug": "x", "sku": "SKU-X", "base_price": "1.00", "product_type": "equipment"},
        headers=headers,
    )
    assert resp.status_code == 403


@pytest.mark.usefixtures("override_get_db")
async def test_admin_creates_product_and_shopper_can_find_it(client, db_session):
    token = await _register_admin(client, db_session, "catadmin1@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    fish = await _create_product(client, headers)
    equipment = await _create_product(
        client, headers, name="Filter", slug="filter-test", sku="SKU-FILTER1", base_price="24.99",
        product_type="equipment", fish_details=None,
    )

    detail = await client.get(f"/api/v1/products/{fish['slug']}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["fish_details"]["species"] == "Paracheirodon innesi"

    non_fish_detail = await client.get(f"/api/v1/products/{equipment['slug']}")
    assert non_fish_detail.json()["fish_details"] is None

    by_search = await client.get("/api/v1/products", params={"search": "Neon Tetra"})
    assert by_search.status_code == 200
    body = by_search.json()
    assert body["total_items"] >= 1
    assert any(p["slug"] == fish["slug"] for p in body["items"])

    combined = await client.get(
        "/api/v1/products",
        params={"category": "does-not-exist", "product_type": "fish", "min_price": "1", "max_price": "10"},
    )
    assert combined.status_code == 200
    assert all(p["slug"] != equipment["slug"] for p in combined.json()["items"])

    not_found = await client.get("/api/v1/products/does-not-exist-slug")
    assert not_found.status_code == 404
    assert not_found.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.usefixtures("override_get_db")
async def test_pagination_and_price_filter(client, db_session):
    token = await _register_admin(client, db_session, "catadmin2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    for i in range(3):
        await _create_product(
            client, headers, name=f"Pag Product {i}", slug=f"pag-product-{i}", sku=f"SKU-PAG{i}",
            base_price=str(10 + i), fish_details=None, product_type="equipment",
        )

    page1 = await client.get("/api/v1/products", params={"search": "Pag Product", "page": 1, "limit": 2})
    body = page1.json()
    assert len(body["items"]) == 2
    assert body["total_items"] == 3
    assert body["total_pages"] == 2

    asc = await client.get("/api/v1/products", params={"search": "Pag Product", "sort": "price_asc"})
    prices = [float(p["price"]["display_price"]) for p in asc.json()["items"]]
    assert prices == sorted(prices)
