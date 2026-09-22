import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.models.user import User, UserRole
from app.main import app


async def _register_admin(client, db_session, email) -> str:
    await client.post("/api/v1/auth/register", json={"name": "Appt Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


@pytest.mark.usefixtures("override_get_db_per_request")
async def test_concurrent_booking_for_last_slot_capacity_only_one_succeeds(client, db_session):
    admin_token = await _register_admin(client, db_session, "apptflowadmin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service = (await client.post(
        "/api/v1/services", json={"name": "Race Svc", "base_price": "10.00", "duration_minutes": 20, "service_type": "consultation"}, headers=admin_headers
    )).json()
    slot = (await client.post(
        f"/api/v1/admin/services/{service['id']}/slots", json={"date": "2026-12-10", "start_time": "09:00:00", "capacity": 1}, headers=admin_headers
    )).json()

    async def _race_booking(email: str) -> int:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            await c.post("/api/v1/auth/register", json={"name": "Racer", "email": email, "password": "racepass1"})
            login = await c.post("/api/v1/auth/login", json={"email": email, "password": "racepass1"})
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            resp = await c.post("/api/v1/appointments", json={"service_id": service["id"], "slot_id": slot["id"]}, headers=headers)
            return resp.status_code

    results = await asyncio.gather(
        _race_booking("apptracer1@example.com"),
        _race_booking("apptracer2@example.com"),
    )
    assert results.count(201) == 1
    assert results.count(422) == 1
