import pytest


async def _register_and_login(client, email="cartuser@example.com") -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Cart User", "email": email, "password": "cartpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "cartpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


async def _create_active_product(client, admin_headers, *, name="Cart Product", price="9.99", stock=5) -> str:
    create = await client.post(
        "/api/v1/products",
        json={
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "sku": f"SKU-{name.upper().replace(' ', '')}",
            "base_price": price,
            "product_type": "equipment",
            "initial_stock_quantity": stock,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)
    return product_id


@pytest.mark.usefixtures("override_get_db")
async def test_cart_add_update_remove_and_stock_validation(client, db_session):
    admin_token = await _register_and_login(client, "cartadmin1@example.com")
    await _promote_to_admin(db_session, "cartadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    product_id = await _create_active_product(client, admin_headers, name="Filter Pump", stock=3)

    customer_token = await _register_and_login(client, "cartcustomer1@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}

    add = await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 2}, headers=headers)
    assert add.status_code == 201
    assert add.json()["items"][0]["quantity"] == 2
    assert add.json()["subtotal"]["display_price"] == "19.98"

    over = await client.patch(
        f"/api/v1/cart/items/{product_id}", json={"quantity": 10}, headers=headers
    )
    assert over.status_code == 422
    assert over.json()["error"]["code"] == "INSUFFICIENT_STOCK"

    remove = await client.delete(f"/api/v1/cart/items/{product_id}", headers=headers)
    assert remove.status_code == 200
    assert remove.json()["items"] == []


@pytest.mark.usefixtures("override_get_db")
async def test_wishlist_prevents_duplicates(client, db_session):
    admin_token = await _register_and_login(client, "wishlistadmin@example.com")
    await _promote_to_admin(db_session, "wishlistadmin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers, name="Wishlist Item")

    customer_token = await _register_and_login(client, "wishlistcustomer@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}

    first = await client.post("/api/v1/wishlist/items", json={"product_id": product_id}, headers=headers)
    assert first.status_code == 201

    second = await client.post("/api/v1/wishlist/items", json={"product_id": product_id}, headers=headers)
    assert second.status_code == 409

    listing = await client.get("/api/v1/wishlist", headers=headers)
    assert len(listing.json()) == 1
