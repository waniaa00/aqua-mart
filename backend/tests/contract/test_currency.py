import pytest


@pytest.mark.usefixtures("override_get_db")
async def test_get_rates_returns_all_supported_currencies(client):
    r = await client.get("/api/v1/currency/rates")
    assert r.status_code == 200
    body = r.json()
    assert body["base_currency"] == "USD"
    assert set(body["rates"].keys()) == {"USD", "GBP", "PKR"}
    assert body["rates"]["USD"] == "1.0000"


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Currency User", "email": email, "password": "currencypass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "currencypass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


@pytest.mark.usefixtures("override_get_db")
async def test_product_price_conversion_and_invalid_currency(client, db_session):
    admin_token = await _register_and_login(client, "currencyadmin@example.com")
    await _promote_to_admin(db_session, "currencyadmin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Currency Test Filter",
            "slug": "currency-test-filter",
            "sku": "SKU-CURRENCY-FILTER",
            "base_price": "20.00",
            "product_type": "equipment",
            "initial_stock_quantity": 5,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)

    usd = await client.get("/api/v1/products/currency-test-filter", params={"currency": "USD"})
    assert usd.json()["price"]["display_currency"] == "USD"
    assert usd.json()["price"]["display_price"] == "20.00"

    pkr = await client.get("/api/v1/products/currency-test-filter", params={"currency": "PKR"})
    assert pkr.json()["price"]["display_currency"] == "PKR"
    assert pkr.json()["price"]["exchange_rate"] is not None
    assert float(pkr.json()["price"]["display_price"]) > float(usd.json()["price"]["display_price"])

    invalid = await client.get("/api/v1/products/currency-test-filter", params={"currency": "XYZ"})
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "INVALID_CURRENCY"


@pytest.mark.usefixtures("override_get_db")
async def test_authenticated_user_default_currency_preference(client, db_session):
    token = await _register_and_login(client, "preferreduser@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    await client.patch("/api/v1/users/me", json={"preferred_currency": "GBP"}, headers=headers)

    admin_token = await _register_and_login(client, "prefadmin@example.com")
    await _promote_to_admin(db_session, "prefadmin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Preference Product",
            "slug": "preference-product",
            "sku": "SKU-PREF-PRODUCT",
            "base_price": "10.00",
            "product_type": "equipment",
            "initial_stock_quantity": 5,
        },
        headers=admin_headers,
    )
    await client.patch(f"/api/v1/products/{create.json()['id']}", json={"status": "active"}, headers=admin_headers)

    # No explicit ?currency= — should default to the authenticated user's GBP preference
    detail = await client.get("/api/v1/products/preference-product", headers=headers)
    assert detail.json()["price"]["display_currency"] == "GBP"
