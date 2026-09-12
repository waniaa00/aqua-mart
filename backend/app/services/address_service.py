import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.db.models.address import Address
from app.schemas.address import AddressRequest, AddressResponse, UpdateAddressRequest


def _to_response(address: Address) -> AddressResponse:
    return AddressResponse(
        id=str(address.id),
        full_name=address.full_name,
        phone=address.phone,
        address_line=address.address_line,
        city=address.city,
        state_province=address.state_province,
        postal_code=address.postal_code,
        country=address.country,
        delivery_instructions=address.delivery_instructions,
        is_default=address.is_default,
    )


async def list_addresses(db: AsyncSession, user_id: uuid.UUID) -> list[AddressResponse]:
    result = await db.execute(select(Address).where(Address.user_id == user_id))
    return [_to_response(a) for a in result.scalars().all()]


async def _get_owned_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> Address:
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    )
    address = result.scalar_one_or_none()
    if address is None:
        raise NotFoundError("The requested address was not found.")
    return address


async def create_address(db: AsyncSession, user_id: uuid.UUID, data: AddressRequest) -> AddressResponse:
    if data.is_default:
        await _unset_existing_default(db, user_id)

    address = Address(user_id=user_id, **data.model_dump(exclude={"is_default"}), is_default=data.is_default)
    db.add(address)
    await db.commit()
    return _to_response(address)


async def update_address(
    db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID, data: UpdateAddressRequest
) -> AddressResponse:
    address = await _get_owned_address(db, user_id, address_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(address, key, value)
    await db.commit()
    return _to_response(address)


async def delete_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> None:
    address = await _get_owned_address(db, user_id, address_id)
    await db.delete(address)
    await db.commit()


async def _unset_existing_default(db: AsyncSession, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Address).where(Address.user_id == user_id, Address.is_default.is_(True))
    )
    for address in result.scalars().all():
        address.is_default = False


async def set_default(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> AddressResponse:
    address = await _get_owned_address(db, user_id, address_id)
    await _unset_existing_default(db, user_id)
    address.is_default = True
    await db.commit()
    return _to_response(address)
