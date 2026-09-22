import uuid
from datetime import date

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
from app.services import appointment_service

router = APIRouter(tags=["services"])


@router.get("/services", response_model=list[ServiceResponse])
async def list_services_route(active: bool = True, db: AsyncSession = Depends(get_db)) -> list[ServiceResponse]:
    return await appointment_service.list_services(db, active)


@router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service_route(service_id: str, db: AsyncSession = Depends(get_db)) -> ServiceResponse:
    return await appointment_service.get_service(db, uuid.UUID(service_id))


@router.get("/services/{service_id}/slots", response_model=list[SlotResponse])
async def list_slots_route(service_id: str, date: date, db: AsyncSession = Depends(get_db)) -> list[SlotResponse]:
    return await appointment_service.list_slots(db, uuid.UUID(service_id), date)


@router.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service_route(
    data: CreateServiceRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> ServiceResponse:
    return await appointment_service.create_service(db, data)


@router.patch("/services/{service_id}", response_model=ServiceResponse)
async def update_service_route(
    service_id: str, data: UpdateServiceRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> ServiceResponse:
    return await appointment_service.update_service(db, uuid.UUID(service_id), data)


@router.post("/admin/services/{service_id}/slots", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
async def create_slot_route(
    service_id: str, data: CreateSlotRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> SlotResponse:
    return await appointment_service.create_slot(db, uuid.UUID(service_id), data)


@router.patch("/admin/slots/{slot_id}", response_model=SlotResponse)
async def update_slot_route(
    slot_id: str, data: UpdateSlotRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> SlotResponse:
    return await appointment_service.update_slot(db, uuid.UUID(slot_id), data)
