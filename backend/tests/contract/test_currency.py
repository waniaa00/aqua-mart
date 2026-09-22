import pytest


@pytest.mark.usefixtures("override_get_db")
async def test_get_rates_returns_all_supported_currencies(client):
    resp = await client.get("/api/v1/currency/rates")
    assert resp.status_code == 200
    body = resp.json()
    assert body["base_currency"] == "USD"
    assert set(body["rates"].keys()) == {"USD", "GBP", "PKR"}
    assert body["rates"]["USD"] == "1.0000"
    assert isinstance(body["is_fallback"], bool)


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Cur Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


@pytest.mark.usefixtures("override_get_db")
async def test_product_price_conversion_and_invalid_currency(client, db_session):
    token = await _register_admin(client, db_session, "curadmin1@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    create = await client.post(
        "/api/v1/products",
        json={"name": "Currency Product", "slug": "currency-product", "sku": "SKU-CUR1", "base_price": "10.00", "product_type": "equipment"},
        headers=headers,
    )
    slug = create.json()["slug"]

    usd = await client.get(f"/api/v1/products/{slug}", params={"currency": "USD"})
    assert usd.json()["price"]["display_currency"] == "USD"
    assert usd.json()["price"]["display_price"] == "10.00"

    gbp = await client.get(f"/api/v1/products/{slug}", params={"currency": "GBP"})
    assert gbp.json()["price"]["display_currency"] == "GBP"
    assert gbp.json()["price"]["display_price"] != "10.00"

    invalid = await client.get("/api/v1/products", params={"currency": "ZZZ"})
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "INVALID_CURRENCY"


@pytest.mark.usefixtures("override_get_db")
async def test_authenticated_user_default_currency_preference(client):
    await client.post("/api/v1/auth/register", json={"name": "Cur User", "email": "curuser@example.com", "password": "curpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "curuser@example.com", "password": "curpass1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    updated = await client.patch("/api/v1/users/me", json={"preferred_currency": "PKR"}, headers=headers)
    assert updated.json()["preferred_currency"] == "PKR"
