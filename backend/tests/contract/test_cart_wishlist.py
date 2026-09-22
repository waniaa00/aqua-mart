import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Cart Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _create_product(client, headers, stock=5, **overrides) -> dict:
    payload = {"name": "Cart Product", "slug": "cart-product", "sku": "SKU-CART1", "base_price": "10.00", "product_type": "equipment", "initial_stock_quantity": stock}
    payload.update(overrides)
    resp = await client.post("/api/v1/products", json=payload, headers=headers)
    product = resp.json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=headers)
    return product


async def _customer_headers(client, email="cartcustomer@example.com") -> dict:
    await client.post("/api/v1/auth/register", json={"name": "Cart Cust", "email": email, "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "custpass1"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.usefixtures("override_get_db")
async def test_cart_add_update_remove_and_stock_validation(client, db_session):
    admin_token = await _register_admin(client, db_session, "cartadmin1@example.com")
    product = await _create_product(client, {"Authorization": f"Bearer {admin_token}"}, stock=3, slug="cart-product-1", sku="SKU-CART-A")
    headers = await _customer_headers(client)

    empty = await client.get("/api/v1/cart", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["items"] == []

    add = await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)
    assert add.status_code == 201
    body = add.json()
    assert len(body["items"]) == 1
    assert body["subtotal"]["display_price"] == "20.00"

    too_many = await client.post("/api/v1/cart/items", json={"product_id": product["id"], "quantity": 100}, headers=headers)
    assert too_many.status_code == 422
    assert too_many.json()["error"]["code"] == "INSUFFICIENT_STOCK"

    update = await client.patch(f"/api/v1/cart/items/{product['id']}", json={"quantity": 1}, headers=headers)
    assert update.json()["subtotal"]["display_price"] == "10.00"

    removed = await client.delete(f"/api/v1/cart/items/{product['id']}", headers=headers)
    assert removed.status_code == 200
    assert removed.json()["items"] == []


@pytest.mark.usefixtures("override_get_db")
async def test_wishlist_prevents_duplicates(client, db_session):
    admin_token = await _register_admin(client, db_session, "cartadmin2@example.com")
    product = await _create_product(client, {"Authorization": f"Bearer {admin_token}"}, slug="wishlist-product-1", sku="SKU-WISH-A")
    headers = await _customer_headers(client, "wishlistcustomer@example.com")

    add = await client.post("/api/v1/wishlist/items", json={"product_id": product["id"]}, headers=headers)
    assert add.status_code == 201

    duplicate = await client.post("/api/v1/wishlist/items", json={"product_id": product["id"]}, headers=headers)
    assert duplicate.status_code in (200, 409)

    listing = await client.get("/api/v1/wishlist", headers=headers)
    assert len(listing.json()) == 1

    check = await client.get(f"/api/v1/wishlist/items/{product['id']}", headers=headers)
    assert check.json()["saved"] is True

    await client.delete(f"/api/v1/wishlist/items/{product['id']}", headers=headers)
    check_after = await client.get(f"/api/v1/wishlist/items/{product['id']}", headers=headers)
    assert check_after.json()["saved"] is False
