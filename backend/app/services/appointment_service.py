import uuid
from datetime import date as date_type

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError, ValidationAppError
from app.db.models.address import Address
from app.db.models.service import Appointment, AppointmentSlot, AppointmentStatus, Service
from app.schemas.common import PaginatedResponse
from app.schemas.service import (
    AppointmentResponse,
    CreateAppointmentRequest,
    CreateServiceRequest,
    CreateSlotRequest,
    ServiceResponse,
    SlotResponse,
    UpdateServiceRequest,
    UpdateSlotRequest,
)
from app.services.product_service import build_money
from app.utils.pagination import clean_page_params, total_pages as compute_total_pages


class SlotUnavailableError(AppError):
    status_code = 422
    code = "SLOT_UNAVAILABLE"


async def list_services(db: AsyncSession, active_only: bool = True) -> list[ServiceResponse]:
    query = select(Service)
    if active_only:
        query = query.where(Service.is_active.is_(True))
    result = await db.execute(query.order_by(Service.name))
    services = list(result.scalars().all())
    return [
        ServiceResponse(
            id=str(s.id), name=s.name, description=s.description, price=await build_money(db, s.base_price, "USD"),
            duration_minutes=s.duration_minutes, service_type=s.service_type, is_active=s.is_active, image_url=s.image_url,
        )
        for s in services
    ]


async def get_service(db: AsyncSession, service_id: uuid.UUID) -> ServiceResponse:
    result = await db.execute(select(Service).where(Service.id == service_id))
    s = result.scalar_one_or_none()
    if s is None:
        raise NotFoundError("Service not found.")
    return ServiceResponse(
        id=str(s.id), name=s.name, description=s.description, price=await build_money(db, s.base_price, "USD"),
        duration_minutes=s.duration_minutes, service_type=s.service_type, is_active=s.is_active, image_url=s.image_url,
    )


async def create_service(db: AsyncSession, data: CreateServiceRequest) -> ServiceResponse:
    from decimal import Decimal

    service = Service(
        name=data.name, description=data.description, base_price=Decimal(data.base_price),
        duration_minutes=data.duration_minutes, service_type=data.service_type, image_url=data.image_url,
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return await get_service(db, service.id)


async def update_service(db: AsyncSession, service_id: uuid.UUID, data: UpdateServiceRequest) -> ServiceResponse:
    from decimal import Decimal

    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if service is None:
        raise NotFoundError("Service not found.")
    updates = data.model_dump(exclude_unset=True)
    if updates.get("base_price") is not None:
        updates["base_price"] = Decimal(updates["base_price"])
    for key, value in updates.items():
        setattr(service, key, value)
    await db.commit()
    return await get_service(db, service_id)


async def list_slots(db: AsyncSession, service_id: uuid.UUID, on_date: date_type) -> list[SlotResponse]:
    result = await db.execute(
        select(AppointmentSlot)
        .where(AppointmentSlot.service_id == service_id, AppointmentSlot.date == on_date, AppointmentSlot.is_blocked.is_(False))
        .order_by(AppointmentSlot.start_time)
    )
    slots = list(result.scalars().all())
    return [
        SlotResponse(
            id=str(s.id), service_id=str(s.service_id), date=s.date, start_time=s.start_time,
            capacity=s.capacity, remaining_capacity=s.remaining_capacity, is_blocked=s.is_blocked,
        )
        for s in slots
    ]


async def create_slot(db: AsyncSession, service_id: uuid.UUID, data: CreateSlotRequest) -> SlotResponse:
    slot = AppointmentSlot(service_id=service_id, date=data.date, start_time=data.start_time, capacity=data.capacity)
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return SlotResponse(
        id=str(slot.id), service_id=str(slot.service_id), date=slot.date, start_time=slot.start_time,
        capacity=slot.capacity, remaining_capacity=slot.remaining_capacity, is_blocked=slot.is_blocked,
    )


async def update_slot(db: AsyncSession, slot_id: uuid.UUID, data: UpdateSlotRequest) -> SlotResponse:
    result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if slot is None:
        raise NotFoundError("Slot not found.")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(slot, key, value)
    await db.commit()
    await db.refresh(slot)
    return SlotResponse(
        id=str(slot.id), service_id=str(slot.service_id), date=slot.date, start_time=slot.start_time,
        capacity=slot.capacity, remaining_capacity=slot.remaining_capacity, is_blocked=slot.is_blocked,
    )


async def appointment_to_response(db: AsyncSession, appt: Appointment) -> AppointmentResponse:
    service_result = await db.execute(select(Service).where(Service.id == appt.service_id))
    service = service_result.scalar_one_or_none()
    slot_result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == appt.slot_id))
    slot = slot_result.scalar_one_or_none()
    return AppointmentResponse(
        id=str(appt.id), service_id=str(appt.service_id), service_name=service.name if service else "",
        slot_id=str(appt.slot_id), date=slot.date if slot else None, start_time=slot.start_time if slot else None,
        status=appt.status.value, notes=appt.notes,
    )


async def book_appointment(db: AsyncSession, user_id: uuid.UUID, data: CreateAppointmentRequest) -> AppointmentResponse:
    service_id = uuid.UUID(data.service_id)
    slot_id = uuid.UUID(data.slot_id)

    service_result = await db.execute(select(Service).where(Service.id == service_id))
    service = service_result.scalar_one_or_none()
    if service is None or not service.is_active:
        raise SlotUnavailableError("This service is not currently available for booking.")

    # Row-lock the slot before re-checking capacity — the standard
    # concurrency-safe pattern (research.md §6), mirroring inventory locking.
    slot_result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == slot_id).with_for_update())
    slot = slot_result.scalar_one_or_none()
    if slot is None or slot.service_id != service_id or slot.is_blocked or slot.booked_count >= slot.capacity:
        raise SlotUnavailableError("That slot is no longer available.")

    address_snapshot = None
    if data.address_id:
        addr_result = await db.execute(select(Address).where(Address.id == uuid.UUID(data.address_id), Address.user_id == user_id))
        address = addr_result.scalar_one_or_none()
        if address is None:
            raise NotFoundError("Address not found.")
        address_snapshot = {
            "full_name": address.full_name, "phone": address.phone, "address_line": address.address_line,
            "city": address.city, "state_province": address.state_province, "postal_code": address.postal_code,
            "country": address.country,
        }

    slot.booked_count += 1
    appointment = Appointment(
        user_id=user_id, service_id=service_id, slot_id=slot_id, status=AppointmentStatus.pending,
        address_snapshot=address_snapshot, notes=data.notes,
    )
    db.add(appointment)
    await db.commit()

    from app.services import notification_service

    await notification_service.notify_appointment_confirmed(db, user_id, appointment.id)
    return await appointment_to_response(db, appointment)


async def cancel_appointment(db: AsyncSession, user_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentResponse:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id, Appointment.user_id == user_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise NotFoundError("Appointment not found.")
    if appt.status in (AppointmentStatus.cancelled, AppointmentStatus.completed):
        raise ValidationAppError(f"Cannot cancel an appointment that is already {appt.status.value}.")

    slot_result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == appt.slot_id).with_for_update())
    slot = slot_result.scalar_one_or_none()
    if slot is not None and slot.booked_count > 0:
        slot.booked_count -= 1

    appt.status = AppointmentStatus.cancelled
    await db.commit()

    from app.services import notification_service

    await notification_service.notify_appointment_cancelled(db, user_id, appt.id)
    return await appointment_to_response(db, appt)


async def list_appointments_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[AppointmentResponse]:
    result = await db.execute(select(Appointment).where(Appointment.user_id == user_id).order_by(Appointment.created_at.desc()))
    appts = list(result.scalars().all())
    return [await appointment_to_response(db, a) for a in appts]


async def get_appointment_for_user(db: AsyncSession, user_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentResponse:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id, Appointment.user_id == user_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise NotFoundError("Appointment not found.")
    return await appointment_to_response(db, appt)


# --- Admin --------------------------------------------------------------------


async def list_appointments_admin(db: AsyncSession, date_filter: date_type | None, status_filter: str | None, page: int, limit: int) -> PaginatedResponse[AppointmentResponse]:
    query = select(Appointment)
    if status_filter:
        query = query.where(Appointment.status == AppointmentStatus(status_filter))
    if date_filter:
        query = query.join(AppointmentSlot, AppointmentSlot.id == Appointment.slot_id).where(AppointmentSlot.date == date_filter)

    params = clean_page_params(page, limit)
    total_items = (await db.execute(select(func.count()).select_from(query.with_only_columns(Appointment.id).subquery()))).scalar_one()
    result = await db.execute(query.order_by(Appointment.created_at.desc()).offset(params.offset).limit(params.limit))
    appts = list(result.scalars().unique().all())
    items = [await appointment_to_response(db, a) for a in appts]
    return PaginatedResponse(items=items, page=params.page, limit=params.limit, total_items=total_items, total_pages=compute_total_pages(total_items, params.limit))


async def update_appointment_status_admin(db: AsyncSession, appointment_id: uuid.UUID, new_status: str) -> AppointmentResponse:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise NotFoundError("Appointment not found.")
    appt.status = AppointmentStatus(new_status)
    await db.commit()
    return await appointment_to_response(db, appt)


async def reschedule_appointment_admin(db: AsyncSession, appointment_id: uuid.UUID, new_slot_id: uuid.UUID) -> AppointmentResponse:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise NotFoundError("Appointment not found.")

    old_slot_result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == appt.slot_id).with_for_update())
    old_slot = old_slot_result.scalar_one_or_none()

    new_slot_result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == new_slot_id).with_for_update())
    new_slot = new_slot_result.scalar_one_or_none()
    if new_slot is None or new_slot.is_blocked or new_slot.booked_count >= new_slot.capacity:
        raise SlotUnavailableError("That slot is no longer available.")

    if old_slot is not None and old_slot.booked_count > 0:
        old_slot.booked_count -= 1
    new_slot.booked_count += 1
    appt.slot_id = new_slot_id

    await db.commit()
    return await appointment_to_response(db, appt)
