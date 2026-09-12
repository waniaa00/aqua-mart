import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Inv Admin", "email": email, "password": "invpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "invpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


@pytest.mark.usefixtures("override_get_db")
async def test_admin_can_adjust_stock_and_low_stock_flag_appears(client, db_session):
    admin_token = await _register_and_login(client, "invadmin@example.com")
    await _promote_to_admin(db_session, "invadmin@example.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Low Stock Widget",
            "slug": "low-stock-widget",
            "sku": "SKU-LOW-STOCK",
            "base_price": "5.00",
            "product_type": "equipment",
            "initial_stock_quantity": 10,
            "low_stock_threshold": 3,
        },
        headers=headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=headers)

    adjust = await client.patch(
        f"/api/v1/products/{product_id}/inventory", json={"adjust_by": -8}, headers=headers
    )
    assert adjust.status_code == 200
    body = adjust.json()
    assert body["stock_quantity"] == 2
    assert body["is_low_stock"] is True

    zero_out = await client.patch(
        f"/api/v1/products/{product_id}/inventory", json={"stock_quantity": 0}, headers=headers
    )
    assert zero_out.json()["status"] == "out_of_stock"

    negative_rejected = await client.patch(
        f"/api/v1/products/{product_id}/inventory", json={"adjust_by": -5}, headers=headers
    )
    assert negative_rejected.status_code == 400
