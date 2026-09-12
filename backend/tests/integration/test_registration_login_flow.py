import pytest


@pytest.mark.usefixtures("override_get_db")
async def test_full_register_login_profile_password_flow(client):
    register = await client.post(
        "/api/v1/auth/register",
        json={"name": "Alice Aquarium", "email": "alice@example.com", "password": "correcthorse1"},
    )
    assert register.status_code == 201

    login = await client.post(
        "/api/v1/auth/login", json={"email": "alice@example.com", "password": "correcthorse1"}
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    profile = await client.get("/api/v1/users/me", headers=headers)
    assert profile.status_code == 200
    assert profile.json()["name"] == "Alice Aquarium"
    assert profile.json()["preferred_currency"] == "USD"

    updated = await client.patch(
        "/api/v1/users/me",
        json={"name": "Alice A.", "preferred_currency": "GBP"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Alice A."
    assert updated.json()["preferred_currency"] == "GBP"

    changed = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "correcthorse1", "new_password": "brandnewpass1"},
        headers=headers,
    )
    assert changed.status_code == 204

    old_login_fails = await client.post(
        "/api/v1/auth/login", json={"email": "alice@example.com", "password": "correcthorse1"}
    )
    assert old_login_fails.status_code == 401

    new_login_works = await client.post(
        "/api/v1/auth/login", json={"email": "alice@example.com", "password": "brandnewpass1"}
    )
    assert new_login_works.status_code == 200
