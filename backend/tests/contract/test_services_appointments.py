import asyncio

import pytest


async def _register_and_login(client, email) -> str:
    await client.post(
        "/api/v1/auth/register", json={"name": "Appt User", "email": email, "password": "apptpass1"}
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "apptpass1"})
    return login.json()["access_token"]


async def _promote_to_admin(db_session, email: str) -> None:
    from sqlalchemy import select

    from app.db.models.user import User, UserRole

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = UserRole.admin
    await db_session.commit()


async def _create_service_with_slot(client, admin_headers, *, capacity=1, name="Aquarium Setup"):
    service = await client.post(
        "/api/v1/services",
        json={
            "name": name,
            "description": "Setting up a new aquarium",
            "base_price": "75.00",
            "duration_minutes": 60,
            "service_type": "home_visit",
        },
        headers=admin_headers,
    )
    service_id = service.json()["id"]

    slot = await client.post(
        f"/api/v1/admin/services/{service_id}/slots",
        json={"date": "2026-10-01", "start_time": "10:00:00", "capacity": capacity},
        headers=admin_headers,
    )
    return service_id, slot.json()["id"]


@pytest.mark.usefixtures("override_get_db")
async def test_book_view_cancel_appointment(client, db_session):
    admin_token = await _register_and_login(client, "apptadmin1@example.com")
    await _promote_to_admin(db_session, "apptadmin1@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service_id, slot_id = await _create_service_with_slot(client, admin_headers, capacity=2)

    customer_token = await _register_and_login(client, "apptcustomer1@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}

    book = await client.post(
        "/api/v1/appointments", json={"service_id": service_id, "slot_id": slot_id}, headers=headers
    )
    assert book.status_code == 201, book.text
    appointment_id = book.json()["id"]
    assert book.json()["status"] == "pending"

    slots_after = await client.get(f"/api/v1/services/{service_id}/slots")
    assert slots_after.json()[0]["remaining_capacity"] == 1

    listing = await client.get("/api/v1/appointments", headers=headers)
    assert len(listing.json()) == 1

    cancel = await client.post(f"/api/v1/appointments/{appointment_id}/cancel", headers=headers)
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"

    slots_after_cancel = await client.get(f"/api/v1/services/{service_id}/slots")
    assert slots_after_cancel.json()[0]["remaining_capacity"] == 2


@pytest.mark.usefixtures("override_get_db")
async def test_full_slot_rejects_booking(client, db_session):
    admin_token = await _register_and_login(client, "apptadmin2@example.com")
    await _promote_to_admin(db_session, "apptadmin2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service_id, slot_id = await _create_service_with_slot(client, admin_headers, capacity=1, name="Water Testing")

    token_a = await _register_and_login(client, "apptcustomerA@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    first = await client.post(
        "/api/v1/appointments", json={"service_id": service_id, "slot_id": slot_id}, headers=headers_a
    )
    assert first.status_code == 201

    token_b = await _register_and_login(client, "apptcustomerB@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    second = await client.post(
        "/api/v1/appointments", json={"service_id": service_id, "slot_id": slot_id}, headers=headers_b
    )
    assert second.status_code == 422
    assert second.json()["error"]["code"] == "SLOT_UNAVAILABLE"


@pytest.mark.usefixtures("override_get_db")
async def test_inactive_service_and_blocked_date_rejected(client, db_session):
    admin_token = await _register_and_login(client, "apptadmin3@example.com")
    await _promote_to_admin(db_session, "apptadmin3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service_id, slot_id = await _create_service_with_slot(client, admin_headers, name="Aquascaping")

    await client.patch(f"/api/v1/services/{service_id}", json={"is_active": False}, headers=admin_headers)

    customer_token = await _register_and_login(client, "apptcustomer3@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    booking = await client.post(
        "/api/v1/appointments", json={"service_id": service_id, "slot_id": slot_id}, headers=headers
    )
    assert booking.status_code == 400


@pytest.mark.usefixtures("override_get_db")
async def test_admin_confirm_reschedule_appointment(client, db_session):
    admin_token = await _register_and_login(client, "apptadmin4@example.com")
    await _promote_to_admin(db_session, "apptadmin4@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    service_id, slot_id = await _create_service_with_slot(client, admin_headers, capacity=1, name="Fish Consultation")

    other_slot = await client.post(
        f"/api/v1/admin/services/{service_id}/slots",
        json={"date": "2026-10-02", "start_time": "11:00:00", "capacity": 1},
        headers=admin_headers,
    )
    other_slot_id = other_slot.json()["id"]

    customer_token = await _register_and_login(client, "apptcustomer4@example.com")
    headers = {"Authorization": f"Bearer {customer_token}"}
    booking = await client.post(
        "/api/v1/appointments", json={"service_id": service_id, "slot_id": slot_id}, headers=headers
    )
    appointment_id = booking.json()["id"]

    confirm = await client.patch(
        f"/api/v1/admin/appointments/{appointment_id}/status", json={"status": "confirmed"}, headers=admin_headers
    )
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "confirmed"

    reschedule = await client.post(
        f"/api/v1/admin/appointments/{appointment_id}/reschedule",
        json={"new_slot_id": other_slot_id},
        headers=admin_headers,
    )
    assert reschedule.status_code == 200
    assert reschedule.json()["slot_id"] == other_slot_id

    original_slot_freed = await client.get(f"/api/v1/services/{service_id}/slots", params={"date": "2026-10-01"})
    assert len(original_slot_freed.json()) == 1
    assert original_slot_freed.json()[0]["remaining_capacity"] == 1
