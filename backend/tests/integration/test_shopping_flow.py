import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Shopper", "email": email, "password": "shopperpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "shopperpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


@pytest.mark.usefixtures("override_get_db")
async def test_full_browse_cart_checkout_history_journey(client, db_session):
    admin_token = await _register_and_login(client, "shoppingadmin@example.com")
    await _promote_to_admin(db_session, "shoppingadmin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Aquarium Starter Kit",
            "slug": "aquarium-starter-kit",
            "sku": "SKU-STARTER-KIT",
            "base_price": "49.99",
            "product_type": "equipment",
            "initial_stock_quantity": 4,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)

    shopper_token = await _register_and_login(client, "shopper@example.com")
    headers = {"Authorization": f"Bearer {shopper_token}"}

    browse = await client.get("/api/v1/products", params={"search": "starter"})
    assert browse.json()["total_items"] == 1

    address = await client.post(
        "/api/v1/users/me/addresses",
        json={
            "full_name": "Shopper One",
            "phone": "555-0101",
            "address_line": "1 Ocean Ave",
            "city": "Reeftown",
            "postal_code": "11111",
            "country": "Testland",
        },
        headers=headers,
    )
    address_id = address.json()["id"]

    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)
    checkout = await client.post("/api/v1/orders", json={"address_id": address_id}, headers=headers)
    assert checkout.status_code == 201

    history = await client.get("/api/v1/orders", headers=headers)
    assert history.json()["total_items"] == 1
    assert history.json()["items"][0]["status"] == "pending"
