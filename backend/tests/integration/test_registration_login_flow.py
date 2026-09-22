import pytest


@pytest.mark.usefixtures("override_get_db")
async def test_full_register_login_profile_password_flow(client):
    register = await client.post(
        "/api/v1/auth/register", json={"name": "Flow User", "email": "flowuser@example.com", "password": "correctpass1"}
    )
    assert register.status_code == 201

    login = await client.post("/api/v1/auth/login", json={"email": "flowuser@example.com", "password": "correctpass1"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = await client.get("/api/v1/users/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["preferred_currency"] == "USD"

    updated = await client.patch("/api/v1/users/me", json={"name": "Updated Name", "preferred_currency": "GBP"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated Name"
    assert updated.json()["preferred_currency"] == "GBP"

    bad_currency = await client.patch("/api/v1/users/me", json={"preferred_currency": "XYZ"}, headers=headers)
    assert bad_currency.status_code == 400

    changed = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "correctpass1", "new_password": "brandnewpass1"},
        headers=headers,
    )
    assert changed.status_code == 204

    relogin = await client.post("/api/v1/auth/login", json={"email": "flowuser@example.com", "password": "brandnewpass1"})
    assert relogin.status_code == 200
