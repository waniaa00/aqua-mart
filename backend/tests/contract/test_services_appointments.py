import pytest


async def _register_admin(client, db_session, email) -> str:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    await client.post("/api/v1/auth/register", json={"name": "Svc Admin", "email": email, "password": "adminpass1"})
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "adminpass1"})
    return login.json()["access_token"]


async def _customer_headers(client, email) -> dict:
    await client.post("/api/v1/auth/register", json={"name": "Svc Cust", "email": email, "password": "custpass1"})
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "custpass1"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.usefixtures("override_get_db")
async def test_book_view_cancel_appointment(client, db_session):
    admin_token = await _register_admin(client, db_session, "svcadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    service = (await client.post(
        "/api/v1/services",
        json={"name": "Test Consultation", "description": "A chat.", "base_price": "25.00", "duration_minutes": 30, "service_type": "consultation"},
        headers=admin_headers,
    )).json()

    slot = (await client.post(
        f"/api/v1/admin/services/{service['id']}/slots",
        json={"date": "2026-12-01", "start_time": "10:00:00", "capacity": 1},
        headers=admin_headers,
    )).json()

    headers = await _customer_headers(client, "svccust1@example.com")

    slots = await client.get(f"/api/v1/services/{service['id']}/slots", params={"date": "2026-12-01"})
    assert slots.status_code == 200
    assert slots.json()[0]["remaining_capacity"] == 1

    booked = await client.post("/api/v1/appointments", json={"service_id": service["id"], "slot_id": slot["id"]}, headers=headers)
    assert booked.status_code == 201
    appt = booked.json()
    assert appt["status"] == "pending"

    after_booking = await client.get(f"/api/v1/services/{service['id']}/slots", params={"date": "2026-12-01"})
    assert after_booking.json()[0]["remaining_capacity"] == 0

    listing = await client.get("/api/v1/appointments", headers=headers)
    assert len(listing.json()) == 1

    cancelled = await client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=headers)
    assert cancelled.json()["status"] == "cancelled"

    after_cancel = await client.get(f"/api/v1/services/{service['id']}/slots", params={"date": "2026-12-01"})
    assert after_cancel.json()[0]["remaining_capacity"] == 1


@pytest.mark.usefixtures("override_get_db")
async def test_full_slot_rejects_booking(client, db_session):
    admin_token = await _register_admin(client, db_session, "svcadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service = (await client.post(
        "/api/v1/services", json={"name": "Full Slot Svc", "base_price": "10.00", "duration_minutes": 20, "service_type": "consultation"}, headers=admin_headers
    )).json()
    slot = (await client.post(
        f"/api/v1/admin/services/{service['id']}/slots", json={"date": "2026-12-02", "start_time": "09:00:00", "capacity": 1}, headers=admin_headers
    )).json()

    headers_a = await _customer_headers(client, "fullslota@example.com")
    first = await client.post("/api/v1/appointments", json={"service_id": service["id"], "slot_id": slot["id"]}, headers=headers_a)
    assert first.status_code == 201

    headers_b = await _customer_headers(client, "fullslotb@example.com")
    second = await client.post("/api/v1/appointments", json={"service_id": service["id"], "slot_id": slot["id"]}, headers=headers_b)
    assert second.status_code == 422
    assert second.json()["error"]["code"] == "SLOT_UNAVAILABLE"


@pytest.mark.usefixtures("override_get_db")
async def test_inactive_service_and_blocked_date_rejected(client, db_session):
    admin_token = await _register_admin(client, db_session, "svcadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service = (await client.post(
        "/api/v1/services", json={"name": "Inactive Svc", "base_price": "10.00", "duration_minutes": 20, "service_type": "consultation"}, headers=admin_headers
    )).json()
    slot = (await client.post(
        f"/api/v1/admin/services/{service['id']}/slots", json={"date": "2026-12-03", "start_time": "09:00:00", "capacity": 1}, headers=admin_headers
    )).json()
    await client.patch(f"/api/v1/services/{service['id']}", json={"is_active": False}, headers=admin_headers)

    headers = await _customer_headers(client, "inactivesvc@example.com")
    resp = await client.post("/api/v1/appointments", json={"service_id": service["id"], "slot_id": slot["id"]}, headers=headers)
    assert resp.status_code == 422

    service2 = (await client.post(
        "/api/v1/services", json={"name": "Blocked Date Svc", "base_price": "10.00", "duration_minutes": 20, "service_type": "consultation"}, headers=admin_headers
    )).json()
    slot2 = (await client.post(
        f"/api/v1/admin/services/{service2['id']}/slots", json={"date": "2026-12-04", "start_time": "09:00:00", "capacity": 1}, headers=admin_headers
    )).json()
    await client.patch(f"/api/v1/admin/slots/{slot2['id']}", json={"is_blocked": True}, headers=admin_headers)

    resp2 = await client.post("/api/v1/appointments", json={"service_id": service2["id"], "slot_id": slot2["id"]}, headers=headers)
    assert resp2.status_code == 422


@pytest.mark.usefixtures("override_get_db")
async def test_admin_confirm_reschedule_appointment(client, db_session):
    admin_token = await _register_admin(client, db_session, "svcadmin4@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service = (await client.post(
        "/api/v1/services", json={"name": "Reschedule Svc", "base_price": "10.00", "duration_minutes": 20, "service_type": "consultation"}, headers=admin_headers
    )).json()
    slot1 = (await client.post(
        f"/api/v1/admin/services/{service['id']}/slots", json={"date": "2026-12-05", "start_time": "09:00:00", "capacity": 1}, headers=admin_headers
    )).json()
    slot2 = (await client.post(
        f"/api/v1/admin/services/{service['id']}/slots", json={"date": "2026-12-06", "start_time": "09:00:00", "capacity": 1}, headers=admin_headers
    )).json()

    headers = await _customer_headers(client, "reschedcust@example.com")
    appt = (await client.post("/api/v1/appointments", json={"service_id": service["id"], "slot_id": slot1["id"]}, headers=headers)).json()

    confirmed = await client.patch(f"/api/v1/admin/appointments/{appt['id']}/status", json={"status": "confirmed"}, headers=admin_headers)
    assert confirmed.json()["status"] == "confirmed"

    rescheduled = await client.post(f"/api/v1/admin/appointments/{appt['id']}/reschedule", json={"new_slot_id": slot2["id"]}, headers=admin_headers)
    assert rescheduled.status_code == 200
    assert rescheduled.json()["date"] == "2026-12-06"

    slot1_after = await client.get(f"/api/v1/services/{service['id']}/slots", params={"date": "2026-12-05"})
    assert slot1_after.json()[0]["remaining_capacity"] == 1
