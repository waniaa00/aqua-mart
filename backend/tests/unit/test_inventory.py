import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Inv Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


@pytest.mark.usefixtures("override_get_db")
async def test_admin_can_adjust_stock_and_low_stock_flag_appears(client, db_session):
    token = await _register_admin(client, db_session, "invadmin1@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    product = (await client.post(
        "/api/v1/products",
        json={"name": "Inventory Product", "slug": "inventory-product", "sku": "SKU-INV1", "base_price": "5.00", "product_type": "equipment", "initial_stock_quantity": 10, "low_stock_threshold": 3},
        headers=headers,
    )).json()
    await client.patch(f"/api/v1/products/{product['id']}", json={"status": "active"}, headers=headers)

    adjusted = await client.patch(f"/api/v1/products/{product['id']}/inventory", json={"adjust_by": -8}, headers=headers)
    assert adjusted.status_code == 200
    assert adjusted.json()["stock_quantity"] == 2

    below_zero = await client.patch(f"/api/v1/products/{product['id']}/inventory", json={"adjust_by": -100}, headers=headers)
    assert below_zero.status_code == 400

    out_of_stock = await client.patch(f"/api/v1/products/{product['id']}/inventory", json={"stock_quantity": 0}, headers=headers)
    assert out_of_stock.json()["status"] == "out_of_stock"

    detail = await client.get(f"/api/v1/products/{product['slug']}")
    assert detail.json()["status"] == "out_of_stock"
    assert detail.json()["stock_quantity"] == 0


@pytest.mark.usefixtures("override_get_db")
async def test_non_admin_cannot_manage_categories_or_inventory(client, db_session):
    token = await _register_admin(client, db_session, "invadmin2@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    product = (await client.post(
        "/api/v1/products",
        json={"name": "Guard Product", "slug": "guard-product", "sku": "SKU-GUARD1", "base_price": "5.00", "product_type": "equipment", "initial_stock_quantity": 5},
        headers=headers,
    )).json()

    await client.post("/api/v1/auth/register", json={"name": "Guard Cust", "email": "guardcust@example.com", "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": "guardcust@example.com", "password": "custpass1"})
    cust_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert (await client.post("/api/v1/categories", json={"name": "Sneaky"}, headers=cust_headers)).status_code == 403
    assert (await client.patch(f"/api/v1/products/{product['id']}/inventory", json={"stock_quantity": 0}, headers=cust_headers)).status_code == 403
