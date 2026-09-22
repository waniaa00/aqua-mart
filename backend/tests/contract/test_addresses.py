import pytest


async def _customer_headers(client, email="addrcustomer@example.com") -> dict:
    await client.post("/api/v1/auth/register", json={"name": "Addr Cust", "email": email, "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "custpass1"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.usefixtures("override_get_db")
async def test_only_one_default_address_at_a_time(client):
    headers = await _customer_headers(client)

    first = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "A", "phone": "555-0001", "address_line": "1 First St", "city": "Town", "postal_code": "11111", "country": "US", "is_default": True},
        headers=headers,
    )
    assert first.status_code == 201
    assert first.json()["is_default"] is True

    second = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "B", "phone": "555-0002", "address_line": "2 Second St", "city": "Town", "postal_code": "22222", "country": "US", "is_default": True},
        headers=headers,
    )
    assert second.status_code == 201
    assert second.json()["is_default"] is True

    listing = (await client.get("/api/v1/users/me/addresses", headers=headers)).json()
    defaults = [a for a in listing if a["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == second.json()["id"]

    set_default = await client.post(f"/api/v1/users/me/addresses/{first.json()['id']}/default", headers=headers)
    assert set_default.json()["is_default"] is True

    listing_after = (await client.get("/api/v1/users/me/addresses", headers=headers)).json()
    defaults_after = [a for a in listing_after if a["is_default"]]
    assert len(defaults_after) == 1
    assert defaults_after[0]["id"] == first.json()["id"]


@pytest.mark.usefixtures("override_get_db")
async def test_cannot_access_another_users_address(client):
    headers_a = await _customer_headers(client, "addressowner@example.com")
    created = await client.post(
        "/api/v1/users/me/addresses",
        json={"full_name": "Owner", "phone": "555-0003", "address_line": "3 Third St", "city": "Town", "postal_code": "33333", "country": "US"},
        headers=headers_a,
    )
    address_id = created.json()["id"]

    headers_b = await _customer_headers(client, "addressintruder@example.com")
    forbidden = await client.patch(f"/api/v1/users/me/addresses/{address_id}", json={"city": "Hacked"}, headers=headers_b)
    assert forbidden.status_code == 404

    forbidden_delete = await client.delete(f"/api/v1/users/me/addresses/{address_id}", headers=headers_b)
    assert forbidden_delete.status_code == 404
