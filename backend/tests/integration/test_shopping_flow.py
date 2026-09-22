import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.models.user import User, UserRole
from app.main import app


async def _register_admin(client, db_session, email) -> str:
    await client.post("/api/v1/auth/register", json={"name": "Flow Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _create_product(client, headers, **overrides) -> dict:
    payload = {"name": "Flow Product", "slug": "flow-product", "sku": "SKU-FLOW1", "base_price": "15.00", "product_type": "equipment", "initial_stock_quantity": 5}
    payload.update(overrides)
    resp = await client.post("/api/v1/products", json=payload, headers=headers)
    product = resp.json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=headers)
    return product


@pytest.mark.usefixtures("override_get_db")
async def test_full_browse_cart_checkout_history_journey(client, db_session):
    admin_token = await _register_admin(client, db_session, "flowadmin1@example.com")
    product = await _create_product(client, {"Authorization": f"Bearer {admin_token}"}, slug="flow-product-1", sku="SKU-FLOW-A")

    await client.post("/api/v1/auth/register", json={"name": "Flow Cust", "email": "flowcust1@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "flowcust1@example.com", "password": "custpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    browse = await client.get("/api/v1/products", params={"search": "Flow Product"})
    assert any(p["slug"] == "flow-product-1" for p in browse.json()["items"])

    await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
    address = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "Flow Cust", "phone": "555-0100", "address_line": "1 Flow St", "city": "Flowtown", "postal_code": "22222", "country": "US"},
        headers=headers,
    )
    order = await client.post("/api/v1/orders", json={"address_id": address.json()["id"]}, headers=headers)
    assert order.status_code == 201

    history = await client.get("/api/v1/orders", headers=headers)
    assert history.json()["total_items"] == 1


@pytest.mark.usefixtures("override_get_db_per_request")
async def test_concurrent_checkout_for_last_unit_only_one_succeeds(client, db_session):
    admin_token = await _register_admin(client, db_session, "flowadmin2@example.com")
    product = await _create_product(
        client, {"Authorization": f"Bearer {admin_token}"}, slug="flow-product-2", sku="SKU-FLOW-B", initial_stock_quantity=1
    )

    async def _customer_checkout(email: str) -> int:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            await c.post("/api/v1/auth/register", json={"name": "Racer", "email": email, "password": "racepass1"})
            login = await c.post("/api/v1/auth/login", json={"email": email, "password": "racepass1"})
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            addr = await c.post(
                "/api/v1/users/me/addresses",
                json={"full_name": "Racer", "phone": "555-0199", "address_line": "1 Race St", "city": "Racetown", "postal_code": "33333", "country": "US"},
                headers=headers,
            )
            await c.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
            checkout = await c.post("/api/v1/orders", json={"address_id": addr.json()["id"]}, headers=headers)
            return checkout.status_code

    results = await asyncio.gather(
        _customer_checkout("racer1@example.com"),
        _customer_checkout("racer2@example.com"),
    )

    assert results.count(201) == 1
    assert results.count(422) == 1
