import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationAppError
from app.db.models.service import Service, ServiceType
from app.schemas.common import Money
from app.schemas.service import CreateServiceRequest, ServiceResponse, UpdateServiceRequest


def _to_response(service: Service) -> ServiceResponse:
    return ServiceResponse(
        id=str(service.id),
        name=service.name,
        description=service.description,
        price=Money.same_currency(service.base_price, "USD"),
        duration_minutes=service.duration_minutes,
        service_type=service.service_type.value,
        is_active=service.is_active,
        image_url=service.image_url,
    )


async def list_services(db: AsyncSession, *, active_only: bool = False) -> list[ServiceResponse]:
    query = select(Service)
    if active_only:
        query = query.where(Service.is_active.is_(True))
    result = await db.execute(query)
    return [_to_response(s) for s in result.scalars().all()]


async def get_service(db: AsyncSession, service_id: uuid.UUID) -> Service:
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if service is None:
        raise NotFoundError("The requested service was not found.")
    return service


async def get_service_response(db: AsyncSession, service_id: uuid.UUID) -> ServiceResponse:
    return _to_response(await get_service(db, service_id))


async def create_service(db: AsyncSession, data: CreateServiceRequest) -> ServiceResponse:
    try:
        service_type = ServiceType(data.service_type)
    except ValueError as exc:
        raise ValidationAppError(f"Invalid service_type: {data.service_type}") from exc

    service = Service(
        name=data.name,
        description=data.description,
        base_price=Decimal(data.base_price),
        duration_minutes=data.duration_minutes,
        service_type=service_type,
        image_url=data.image_url,
    )
    db.add(service)
    await db.commit()
    return _to_response(service)


async def update_service(db: AsyncSession, service_id: uuid.UUID, data: UpdateServiceRequest) -> ServiceResponse:
    service = await get_service(db, service_id)

    if data.name is not None:
        service.name = data.name
    if data.description is not None:
        service.description = data.description
    if data.base_price is not None:
        service.base_price = Decimal(data.base_price)
    if data.duration_minutes is not None:
        service.duration_minutes = data.duration_minutes
    if data.is_active is not None:
        service.is_active = data.is_active
    if data.image_url is not None:
        service.image_url = data.image_url

    await db.commit()
    return _to_response(service)
