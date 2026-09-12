import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Review User", "email": email, "password": "reviewpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "reviewpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


async def _create_active_product(client, admin_headers, *, name="Review Product", stock=5) -> str:
    create = await client.post(
        "/api/v1/products",
        json={
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "sku": f"SKU-{name.upper().replace(' ', '')}",
            "base_price": "12.00",
            "product_type": "equipment",
            "initial_stock_quantity": stock,
        },
        headers=admin_headers,
    )
    product_id = create.json()["id"]
    await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=admin_headers)
    return product_id


async def _create_address(client, headers) -> str:
    r = await client.post(
        "/api/v1/users/me/addresses",
        json={
            "full_name": "Reviewer",
            "phone": "555-0199",
            "address_line": "1 Review St",
            "city": "Reviewtown",
            "postal_code": "33333",
            "country": "Testland",
        },
        headers=headers,
    )
    return r.json()["id"]


@pytest.mark.usefixtures("override_get_db")
async def test_cannot_review_without_purchase(client, db_session):
    admin_token = await _register_and_login(client, "reviewadmin1@example.com")
    await _promote_to_admin(db_session, "reviewadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers)

    customer_token = await _register_and_login(client, "noorder@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}

    review = await client.post(
        f"/api/v1/products/{product_id}/reviews",
        json={"order_item_id": "00000000-0000-0000-0000-000000000000", "rating": 5, "review_text": "Great!"},
        headers=headers,
    )
    assert review.status_code == 403


@pytest.mark.usefixtures("override_get_db")
async def test_review_requires_completed_order_and_prevents_duplicate(client, db_session):
    admin_token = await _register_and_login(client, "reviewadmin2@example.com")
    await _promote_to_admin(db_session, "reviewadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    product_id = await _create_active_product(client, admin_headers)

    customer_token = await _register_and_login(client, "reviewer@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    address_id = await _create_address(client, headers)

    await client.post("/api/v1/cart/items", json={"product_id": product_id, "quantity": 1}, headers=headers)
    order = (await client.post("/api/v1/orders", json={"address_id": address_id}, headers=headers)).json()

    # Order is still pending — review must be rejected
    from sqlalchemy import select

    from app.db.models.order import Order, OrderItem, OrderStatus

    result = await db_session.execute(select(OrderItem).where(OrderItem.order_id == order["id"]))
    order_item = result.scalar_one()

    pending_review = await client.post(
        f"/api/v1/products/{product_id}/reviews",
        json={"order_item_id": str(order_item.id), "rating": 4, "review_text": "Nice"},
        headers=headers,
    )
    assert pending_review.status_code == 403

    # Admin completes the order
    admin_result = await db_session.execute(select(Order).where(Order.id == order["id"]))
    order_row = admin_result.scalar_one()
    order_row.status = OrderStatus.confirmed
    await db_session.commit()
    await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "processing"}, headers=admin_headers
    )
    await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "ready_for_delivery"}, headers=admin_headers
    )
    await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "out_for_delivery"}, headers=admin_headers
    )
    completed = await client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "completed"}, headers=admin_headers
    )
    assert completed.status_code == 200

    good_review = await client.post(
        f"/api/v1/products/{product_id}/reviews",
        json={"order_item_id": str(order_item.id), "rating": 5, "review_text": "Excellent!"},
        headers=headers,
    )
    assert good_review.status_code == 201, good_review.text

    duplicate = await client.post(
        f"/api/v1/products/{product_id}/reviews",
        json={"order_item_id": str(order_item.id), "rating": 3, "review_text": "Again"},
        headers=headers,
    )
    assert duplicate.status_code == 409

    listing = await client.get(f"/api/v1/products/{product_id}/reviews")
    assert len(listing.json()) == 1
