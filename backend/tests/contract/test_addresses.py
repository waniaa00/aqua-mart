import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Address User", "email": email, "password": "addresspass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "addresspass1"})
    return login.json()["access_token"]


def _address_payload(**overrides):
    payload = {
        "full_name": "Home Owner",
        "phone": "555-0111",
        "address_line": "42 Coral Lane",
        "city": "Reeftown",
        "postal_code": "22222",
        "country": "Testland",
    }
    payload.update(overrides)
    return payload


@pytest.mark.usefixtures("override_get_db")
async def test_only_one_default_address_at_a_time(client):
    token = await _register_and_login(client, "addressowner@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    first = await client.post(
        "/api/v1/users/me/addresses", json=_address_payload(is_default=True), headers=headers
    )
    assert first.status_code == 201
    assert first.json()["is_default"] is True

    second = await client.post(
        "/api/v1/users/me/addresses", json=_address_payload(address_line="99 Kelp Way"), headers=headers
    )
    assert second.status_code == 201
    assert second.json()["is_default"] is False

    make_second_default = await client.post(
        f"/api/v1/users/me/addresses/{second.json()['id']}/default", headers=headers
    )
    assert make_second_default.status_code == 200
    assert make_second_default.json()["is_default"] is True

    listing = await client.get("/api/v1/users/me/addresses", headers=headers)
    defaults = [a for a in listing.json() if a["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == second.json()["id"]


@pytest.mark.usefixtures("override_get_db")
async def test_cannot_access_another_users_address(client):
    token_a = await _register_and_login(client, "addressownerA@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    created = await client.post("/api/v1/users/me/addresses", json=_address_payload(), headers=headers_a)

    token_b = await _register_and_login(client, "addressownerB@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    forbidden = await client.patch(
        f"/api/v1/users/me/addresses/{created.json()['id']}", json={"city": "Hacked"}, headers=headers_b
    )
    assert forbidden.status_code == 404
