import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.service import (
    AppointmentResponse,
    CreateAppointmentRequest,
    RescheduleAppointmentRequest,
    UpdateAppointmentStatusRequest,
)
from app.services import appointment_service

router = APIRouter(tags=["appointments"])


@router.post("/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment_route(
    data: CreateAppointmentRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.book_appointment(db, user.id, data)


@router.get("/appointments", response_model=list[AppointmentResponse])
async def list_appointments_route(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[AppointmentResponse]:
    return await appointment_service.list_appointments_for_user(db, user.id)


@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment_route(
    appointment_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.get_appointment_for_user(db, user.id, uuid.UUID(appointment_id))


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment_route(
    appointment_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.cancel_appointment(db, user.id, uuid.UUID(appointment_id))


@router.get("/admin/appointments", response_model=PaginatedResponse[AppointmentResponse])
async def list_appointments_admin_route(
    date: date | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[AppointmentResponse]:
    return await appointment_service.list_appointments_admin(db, date, status, page, limit)


@router.patch("/admin/appointments/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status_route(
    appointment_id: str, data: UpdateAppointmentStatusRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.update_appointment_status_admin(db, uuid.UUID(appointment_id), data.status)


@router.post("/admin/appointments/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment_route(
    appointment_id: str, data: RescheduleAppointmentRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.reschedule_appointment_admin(db, uuid.UUID(appointment_id), uuid.UUID(data.new_slot_id))
