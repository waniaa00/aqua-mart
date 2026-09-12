import asyncio

import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Racer", "email": email, "password": "racerpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "racerpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


@pytest.mark.usefixtures("override_get_db")
async def test_concurrent_booking_for_last_slot_capacity_only_one_succeeds(client, db_session):
    admin_token = await _register_and_login(client, "raceadmin@example.com")
    await _promote_to_admin(db_session, "raceadmin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    service = await client.post(
        "/api/v1/services",
        json={
            "name": "Race Condition Service",
            "base_price": "50.00",
            "duration_minutes": 30,
            "service_type": "consultation",
        },
        headers=admin_headers,
    )
    service_id = service.json()["id"]
    slot = await client.post(
        f"/api/v1/admin/services/{service_id}/slots",
        json={"date": "2026-11-01", "start_time": "09:00:00", "capacity": 1},
        headers=admin_headers,
    )
    slot_id = slot.json()["id"]

    token_a = await _register_and_login(client, "slotracerA@example.com")
    token_b = await _register_and_login(client, "slotracerB@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    results = await asyncio.gather(
        client.post("/api/v1/appointments", json={"service_id": service_id, "slot_id": slot_id}, headers=headers_a),
        client.post("/api/v1/appointments", json={"service_id": service_id, "slot_id": slot_id}, headers=headers_b),
        return_exceptions=True,
    )

    statuses = sorted(r.status_code for r in results if not isinstance(r, Exception))
    assert statuses == [201, 422], f"Expected exactly one booking success and one slot-unavailable rejection, got {statuses}"
