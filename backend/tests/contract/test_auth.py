import pytest


@pytest.mark.usefixtures("override_get_db")
async def test_register_login_and_duplicate_email(client, db_session):
    payload = {"name": "Jane Doe", "email": "jane@example.com", "password": "correcthorse1"}
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "jane@example.com"
    assert body["name"] == "Jane Doe"
    assert body["role"] == "customer"

    # Duplicate registration
    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"

    # Login success
    r3 = await client.post(
        "/api/v1/auth/login", json={"email": "jane@example.com", "password": "correcthorse1"}
    )
    assert r3.status_code == 200
    token = r3.json()["access_token"]
    assert token

    # Login with wrong password — same error regardless of which field was wrong
    r4 = await client.post(
        "/api/v1/auth/login", json={"email": "jane@example.com", "password": "wrongpassword1"}
    )
    assert r4.status_code == 401
    wrong_password_message = r4.json()["error"]["message"]

    r5 = await client.post(
        "/api/v1/auth/login", json={"email": "unknown@example.com", "password": "wrongpassword1"}
    )
    assert r5.status_code == 401
    assert r5.json()["error"]["message"] == wrong_password_message

    # Access protected resource
    r6 = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r6.status_code == 200
    assert r6.json()["email"] == "jane@example.com"

    # No token at all
    r7 = await client.get("/api/v1/users/me")
    assert r7.status_code == 401


@pytest.mark.usefixtures("override_get_db")
async def test_change_password_requires_correct_current_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Bob", "email": "bob@example.com", "password": "correcthorse1"},
    )
    login = await client.post(
        "/api/v1/auth/login", json={"email": "bob@example.com", "password": "correcthorse1"}
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrongpassword1", "new_password": "newpassword1"},
        headers=headers,
    )
    assert bad.status_code == 400

    good = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "correcthorse1", "new_password": "newpassword1"},
        headers=headers,
    )
    assert good.status_code == 204

    relogin = await client.post(
        "/api/v1/auth/login", json={"email": "bob@example.com", "password": "newpassword1"}
    )
    assert relogin.status_code == 200
