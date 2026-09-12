import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, SlotUnavailableError, ValidationAppError
from app.db.models.address import Address
from app.db.models.service import Appointment, AppointmentSlot, AppointmentStatus, Service
from app.schemas.service import AppointmentResponse, SlotResponse
from app.services import notification_service

# Forward-only status transitions, mirroring order status discipline (FR-042).
APPOINTMENT_STATUS_TRANSITIONS: dict[AppointmentStatus, set[AppointmentStatus]] = {
    AppointmentStatus.pending: {AppointmentStatus.confirmed, AppointmentStatus.cancelled},
    AppointmentStatus.confirmed: {AppointmentStatus.in_progress, AppointmentStatus.cancelled, AppointmentStatus.no_show},
    AppointmentStatus.in_progress: {AppointmentStatus.completed, AppointmentStatus.cancelled},
    AppointmentStatus.completed: set(),
    AppointmentStatus.cancelled: set(),
    AppointmentStatus.no_show: set(),
}


def _slot_to_response(slot: AppointmentSlot) -> SlotResponse:
    return SlotResponse(
        id=str(slot.id),
        service_id=str(slot.service_id),
        date=slot.date,
        start_time=slot.start_time,
        capacity=slot.capacity,
        remaining_capacity=slot.remaining_capacity,
        is_blocked=slot.is_blocked,
    )


def _appointment_to_response(appointment: Appointment, service_name: str) -> AppointmentResponse:
    return AppointmentResponse(
        id=str(appointment.id),
        service_id=str(appointment.service_id),
        service_name=service_name,
        slot_id=str(appointment.slot_id),
        date=appointment.slot.date,
        start_time=appointment.slot.start_time,
        status=appointment.status.value,
        notes=appointment.notes,
    )


async def list_slots(db: AsyncSession, service_id: uuid.UUID, target_date: date | None = None) -> list[SlotResponse]:
    query = select(AppointmentSlot).where(
        AppointmentSlot.service_id == service_id, AppointmentSlot.is_blocked.is_(False)
    )
    if target_date is not None:
        query = query.where(AppointmentSlot.date == target_date)
    result = await db.execute(query)
    slots = [s for s in result.scalars().all() if s.remaining_capacity > 0]
    return [_slot_to_response(s) for s in slots]


async def create_slot(db: AsyncSession, service_id: uuid.UUID, target_date: date, start_time, capacity: int) -> SlotResponse:
    slot = AppointmentSlot(service_id=service_id, date=target_date, start_time=start_time, capacity=capacity)
    db.add(slot)
    await db.commit()
    return _slot_to_response(slot)


async def update_slot(db: AsyncSession, slot_id: uuid.UUID, *, capacity: int | None, is_blocked: bool | None) -> SlotResponse:
    result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if slot is None:
        raise NotFoundError("The requested appointment slot was not found.")
    if capacity is not None:
        if capacity < slot.booked_count:
            raise ValidationAppError("Capacity cannot be set below the number of already-booked appointments.")
        slot.capacity = capacity
    if is_blocked is not None:
        slot.is_blocked = is_blocked
    await db.commit()
    return _slot_to_response(slot)


async def book_appointment(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    service_id: uuid.UUID,
    slot_id: uuid.UUID,
    address_id: uuid.UUID | None,
    notes: str | None,
) -> AppointmentResponse:
    service_result = await db.execute(select(Service).where(Service.id == service_id))
    service = service_result.scalar_one_or_none()
    if service is None:
        raise NotFoundError("The requested service was not found.")
    if not service.is_active:
        raise ValidationAppError("This service is not currently available for booking.")

    # Row-lock the slot and re-check availability inside the transaction (research.md §6),
    # the same pattern used for inventory, to make this safe under concurrent bookings.
    slot_result = await db.execute(
        select(AppointmentSlot).where(AppointmentSlot.id == slot_id).with_for_update()
    )
    slot = slot_result.scalar_one_or_none()
    if slot is None:
        raise NotFoundError("The requested appointment slot was not found.")
    if slot.service_id != service.id:
        raise ValidationAppError("This slot does not belong to the requested service.")
    if slot.is_blocked or slot.remaining_capacity <= 0:
        raise SlotUnavailableError("This appointment slot is no longer available.")

    address_snapshot = None
    if address_id is not None:
        address_result = await db.execute(
            select(Address).where(Address.id == address_id, Address.user_id == user_id)
        )
        address = address_result.scalar_one_or_none()
        if address is None:
            raise NotFoundError("The requested address was not found.")
        address_snapshot = {
            "full_name": address.full_name,
            "phone": address.phone,
            "address_line": address.address_line,
            "city": address.city,
            "state_province": address.state_province,
            "postal_code": address.postal_code,
            "country": address.country,
        }

    slot.booked_count += 1

    appointment = Appointment(
        user_id=user_id,
        service_id=service.id,
        slot_id=slot.id,
        status=AppointmentStatus.pending,
        address_snapshot=address_snapshot,
        notes=notes,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment, attribute_names=["slot"])

    return _appointment_to_response(appointment, service.name)


async def _get_owned_appointment(db: AsyncSession, user_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment:
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.slot))
        .where(Appointment.id == appointment_id, Appointment.user_id == user_id)
    )
    appointment = result.scalar_one_or_none()
    if appointment is None:
        raise NotFoundError("The requested appointment was not found.")
    return appointment


async def _service_name(db: AsyncSession, service_id: uuid.UUID) -> str:
    result = await db.execute(select(Service.name).where(Service.id == service_id))
    return result.scalar_one_or_none() or ""


async def list_appointments_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[AppointmentResponse]:
    result = await db.execute(
        select(Appointment).options(selectinload(Appointment.slot)).where(Appointment.user_id == user_id)
    )
    appointments = result.scalars().all()
    return [_appointment_to_response(a, await _service_name(db, a.service_id)) for a in appointments]


async def get_appointment_for_user(db: AsyncSession, user_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentResponse:
    appointment = await _get_owned_appointment(db, user_id, appointment_id)
    return _appointment_to_response(appointment, await _service_name(db, appointment.service_id))


async def cancel_appointment(db: AsyncSession, user_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentResponse:
    appointment = await _get_owned_appointment(db, user_id, appointment_id)
    if appointment.status in (AppointmentStatus.completed, AppointmentStatus.cancelled):
        raise ValidationAppError(f"Cannot cancel an appointment that is already {appointment.status.value}.")

    slot_result = await db.execute(
        select(AppointmentSlot).where(AppointmentSlot.id == appointment.slot_id).with_for_update()
    )
    slot = slot_result.scalar_one()
    slot.booked_count = max(0, slot.booked_count - 1)

    appointment.status = AppointmentStatus.cancelled
    await db.commit()

    await notification_service.record_event(
        db,
        recipient_user_id=user_id,
        event_type="appointment_cancelled",
        payload={"appointment_id": str(appointment.id)},
    )

    return _appointment_to_response(appointment, await _service_name(db, appointment.service_id))


async def list_appointments_admin(db: AsyncSession, *, target_date: date | None, status: str | None) -> list[AppointmentResponse]:
    query = select(Appointment).options(selectinload(Appointment.slot))
    if status:
        try:
            query = query.where(Appointment.status == AppointmentStatus(status))
        except ValueError as exc:
            raise ValidationAppError(f"Invalid status: {status}") from exc

    result = await db.execute(query)
    appointments = result.scalars().all()
    if target_date is not None:
        appointments = [a for a in appointments if a.slot.date == target_date]
    return [_appointment_to_response(a, await _service_name(db, a.service_id)) for a in appointments]


async def update_appointment_status(db: AsyncSession, appointment_id: uuid.UUID, new_status: str) -> AppointmentResponse:
    result = await db.execute(
        select(Appointment).options(selectinload(Appointment.slot)).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if appointment is None:
        raise NotFoundError("The requested appointment was not found.")

    try:
        target = AppointmentStatus(new_status)
    except ValueError as exc:
        raise ValidationAppError(f"Invalid status: {new_status}") from exc

    allowed = APPOINTMENT_STATUS_TRANSITIONS.get(appointment.status, set())
    if target not in allowed:
        raise ValidationAppError(f"Cannot transition appointment from {appointment.status.value} to {target.value}.")

    if target == AppointmentStatus.cancelled:
        slot_result = await db.execute(
            select(AppointmentSlot).where(AppointmentSlot.id == appointment.slot_id).with_for_update()
        )
        slot = slot_result.scalar_one()
        slot.booked_count = max(0, slot.booked_count - 1)

    appointment.status = target
    await db.commit()

    event_type = "appointment_confirmed" if target == AppointmentStatus.confirmed else "appointment_cancelled"
    if target in (AppointmentStatus.confirmed, AppointmentStatus.cancelled):
        await notification_service.record_event(
            db,
            recipient_user_id=appointment.user_id,
            event_type=event_type,
            payload={"appointment_id": str(appointment.id), "status": target.value},
        )

    return _appointment_to_response(appointment, await _service_name(db, appointment.service_id))


async def reschedule_appointment(db: AsyncSession, appointment_id: uuid.UUID, new_slot_id: uuid.UUID) -> AppointmentResponse:
    result = await db.execute(
        select(Appointment).options(selectinload(Appointment.slot)).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if appointment is None:
        raise NotFoundError("The requested appointment was not found.")

    old_slot_result = await db.execute(
        select(AppointmentSlot).where(AppointmentSlot.id == appointment.slot_id).with_for_update()
    )
    old_slot = old_slot_result.scalar_one()

    new_slot_result = await db.execute(
        select(AppointmentSlot).where(AppointmentSlot.id == new_slot_id).with_for_update()
    )
    new_slot = new_slot_result.scalar_one_or_none()
    if new_slot is None:
        raise NotFoundError("The requested appointment slot was not found.")
    if new_slot.is_blocked or new_slot.remaining_capacity <= 0:
        raise SlotUnavailableError("The requested new slot is not available.")

    old_slot.booked_count = max(0, old_slot.booked_count - 1)
    new_slot.booked_count += 1
    appointment.slot_id = new_slot.id

    await db.commit()
    await db.refresh(appointment, attribute_names=["slot"])

    return _appointment_to_response(appointment, await _service_name(db, appointment.service_id))
