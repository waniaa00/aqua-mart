import pytest


async def _make_admin_token(client, email="admin@example.com") -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Admin", "email": email, "password": "adminpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


@pytest.mark.usefixtures("override_get_db")
async def test_non_admin_cannot_create_product(client):
    token = await _make_admin_token(client, "notadmin@example.com")
    r = await client.post(
        "/api/v1/products",
        json={
            "name": "Betta Fish",
            "slug": "betta-fish",
            "sku": "FISH-BETTA-01",
            "base_price": "12.99",
            "product_type": "fish",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.usefixtures("override_get_db")
async def test_admin_creates_product_and_shopper_can_find_it(client, db_session):
    admin_token = await _make_admin_token(client, "catalogadmin@example.com")
    await _promote_to_admin(db_session, "catalogadmin@example.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Royal Blue Betta",
            "slug": "royal-blue-betta",
            "description": "A vibrant freshwater betta.",
            "sku": "FISH-BETTA-RB",
            "base_price": "15.50",
            "product_type": "fish",
            "fish_details": {"species": "Betta splendens", "freshwater_or_marine": "freshwater", "difficulty": "beginner"},
            "initial_stock_quantity": 10,
        },
        headers=headers,
    )
    assert create.status_code == 201, create.text
    product_id = create.json()["id"]

    activate = await client.patch(f"/api/v1/products/{product_id}", json={"status": "active"}, headers=headers)
    assert activate.status_code == 200
    assert activate.json()["status"] == "active"

    # Publicly searchable now
    search = await client.get("/api/v1/products", params={"search": "betta"})
    assert search.status_code == 200
    body = search.json()
    assert body["total_items"] == 1
    assert body["items"][0]["slug"] == "royal-blue-betta"

    # Fish detail present
    detail = await client.get("/api/v1/products/royal-blue-betta")
    assert detail.status_code == 200
    assert detail.json()["fish_details"]["species"] == "Betta splendens"
    assert detail.json()["stock_quantity"] == 10

    # Filter by freshwater/marine + difficulty combined
    filtered = await client.get(
        "/api/v1/products", params={"freshwater_or_marine": "freshwater", "difficulty": "beginner"}
    )
    assert filtered.json()["total_items"] == 1

    filtered_out = await client.get(
        "/api/v1/products", params={"freshwater_or_marine": "marine"}
    )
    assert filtered_out.json()["total_items"] == 0


@pytest.mark.usefixtures("override_get_db")
async def test_pagination_and_price_filter(client, db_session):
    admin_token = await _make_admin_token(client, "paginationadmin@example.com")
    await _promote_to_admin(db_session, "paginationadmin@example.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    for i in range(5):
        create = await client.post(
            "/api/v1/products",
            json={
                "name": f"Filter Product {i}",
                "slug": f"filter-product-{i}",
                "sku": f"SKU-FILTER-{i}",
                "base_price": str(10 + i),
                "product_type": "equipment",
                "initial_stock_quantity": 5,
            },
            headers=headers,
        )
        await client.patch(f"/api/v1/products/{create.json()['id']}", json={"status": "active"}, headers=headers)

    page1 = await client.get("/api/v1/products", params={"category": None, "page": 1, "limit": 2, "min_price": 11, "max_price": 13})
    assert page1.status_code == 200
    body = page1.json()
    assert body["total_items"] == 3  # prices 11, 12, 13
    assert body["total_pages"] == 2
    assert len(body["items"]) == 2
