import uuid
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.service import AppointmentResponse, RescheduleAppointmentRequest, UpdateAppointmentStatusRequest
from app.services import appointment_service

router = APIRouter(prefix="/admin/appointments", tags=["admin-appointments"])


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments_admin_route(
    date: date | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[AppointmentResponse]:
    return await appointment_service.list_appointments_admin(db, target_date=date, status=status)


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status_route(
    appointment_id: str,
    data: UpdateAppointmentStatusRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AppointmentResponse:
    return await appointment_service.update_appointment_status(db, uuid.UUID(appointment_id), data.status)


@router.post("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment_route(
    appointment_id: str,
    data: RescheduleAppointmentRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AppointmentResponse:
    return await appointment_service.reschedule_appointment(
        db, uuid.UUID(appointment_id), uuid.UUID(data.new_slot_id)
    )
