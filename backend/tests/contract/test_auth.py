import pytest


@pytest.mark.usefixtures("override_get_db")
async def test_register_login_and_duplicate_email(client):
    register = await client.post(
        "/api/v1/auth/register", json={"name": "Auth User", "email": "authuser@example.com", "password": "correctpass1"}
    )
    assert register.status_code == 201
    body = register.json()
    assert body["email"] == "authuser@example.com"
    assert "password" not in body
    assert "password_hash" not in body

    duplicate = await client.post(
        "/api/v1/auth/register", json={"name": "Someone Else", "email": "authuser@example.com", "password": "correctpass1"}
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"

    login = await client.post("/api/v1/auth/login", json={"email": "authuser@example.com", "password": "correctpass1"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    assert login.json()["token_type"] == "bearer"

    wrong_password = await client.post("/api/v1/auth/login", json={"email": "authuser@example.com", "password": "wrongpass1"})
    assert wrong_password.status_code == 401
    wrong_password_message = wrong_password.json()["error"]["message"]

    wrong_email = await client.post("/api/v1/auth/login", json={"email": "nosuchuser@example.com", "password": "wrongpass1"})
    assert wrong_email.status_code == 401
    assert wrong_email.json()["error"]["message"] == wrong_password_message  # identical, no field hint

    me = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["name"] == "Auth User"


@pytest.mark.usefixtures("override_get_db")
async def test_change_password_requires_correct_current_password(client):
    await client.post(
        "/api/v1/auth/register", json={"name": "Pw User", "email": "pwuser@example.com", "password": "correctpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": "pwuser@example.com", "password": "correctpass1"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    wrong_current = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "notcorrect1", "new_password": "newpassword1"},
        headers=headers,
    )
    assert wrong_current.status_code == 400
    assert wrong_current.json()["error"]["code"] == "VALIDATION_ERROR"

    correct = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "correctpass1", "new_password": "newpassword1"},
        headers=headers,
    )
    assert correct.status_code == 204

    relogin = await client.post("/api/v1/auth/login", json={"email": "pwuser@example.com", "password": "newpassword1"})
    assert relogin.status_code == 200
