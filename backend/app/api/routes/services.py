import uuid
from datetime import date, time

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.service import (
    CreateServiceRequest,
    CreateSlotRequest,
    ServiceResponse,
    SlotResponse,
    UpdateServiceRequest,
    UpdateSlotRequest,
)
from app.services import service_service, appointment_service

router = APIRouter(tags=["services"])


@router.get("/services", response_model=list[ServiceResponse])
async def list_services_route(
    active: bool = True, db: AsyncSession = Depends(get_db)
) -> list[ServiceResponse]:
    return await service_service.list_services(db, active_only=active)


@router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service_route(service_id: str, db: AsyncSession = Depends(get_db)) -> ServiceResponse:
    return await service_service.get_service_response(db, uuid.UUID(service_id))


@router.get("/services/{service_id}/slots", response_model=list[SlotResponse])
async def list_slots_route(
    service_id: str, date: date | None = None, db: AsyncSession = Depends(get_db)
) -> list[SlotResponse]:
    return await appointment_service.list_slots(db, uuid.UUID(service_id), date)


@router.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service_route(
    data: CreateServiceRequest, db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)
) -> ServiceResponse:
    return await service_service.create_service(db, data)


@router.patch("/services/{service_id}", response_model=ServiceResponse)
async def update_service_route(
    service_id: str,
    data: UpdateServiceRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ServiceResponse:
    return await service_service.update_service(db, uuid.UUID(service_id), data)


@router.post("/admin/services/{service_id}/slots", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
async def create_slot_route(
    service_id: str,
    data: CreateSlotRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> SlotResponse:
    return await appointment_service.create_slot(db, uuid.UUID(service_id), data.date, data.start_time, data.capacity)


@router.patch("/admin/slots/{slot_id}", response_model=SlotResponse)
async def update_slot_route(
    slot_id: str,
    data: UpdateSlotRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> SlotResponse:
    return await appointment_service.update_slot(db, uuid.UUID(slot_id), capacity=data.capacity, is_blocked=data.is_blocked)
