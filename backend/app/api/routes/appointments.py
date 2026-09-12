import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.service import AppointmentResponse, CreateAppointmentRequest
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment_route(
    data: CreateAppointmentRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.book_appointment(
        db,
        user.id,
        service_id=uuid.UUID(data.service_id),
        slot_id=uuid.UUID(data.slot_id),
        address_id=uuid.UUID(data.address_id) if data.address_id else None,
        notes=data.notes,
    )


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments_route(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[AppointmentResponse]:
    return await appointment_service.list_appointments_for_user(db, user.id)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment_route(
    appointment_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.get_appointment_for_user(db, user.id, uuid.UUID(appointment_id))


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment_route(
    appointment_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AppointmentResponse:
    return await appointment_service.cancel_appointment(db, user.id, uuid.UUID(appointment_id))
