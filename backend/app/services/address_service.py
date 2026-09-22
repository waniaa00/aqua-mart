import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.db.models.address import Address
from app.schemas.address import AddressRequest, UpdateAddressRequest


async def list_addresses(db: AsyncSession, user_id: uuid.UUID) -> list[Address]:
    result = await db.execute(select(Address).where(Address.user_id == user_id).order_by(Address.created_at))
    return list(result.scalars().all())


async def _get_owned(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> Address:
    result = await db.execute(select(Address).where(Address.id == address_id, Address.user_id == user_id))
    address = result.scalar_one_or_none()
    if address is None:
        raise NotFoundError("Address not found.")
    return address


async def _unset_other_defaults(db: AsyncSession, user_id: uuid.UUID, keep_id: uuid.UUID | None = None) -> None:
    result = await db.execute(select(Address).where(Address.user_id == user_id, Address.is_default.is_(True)))
    for addr in result.scalars().all():
        if keep_id is None or addr.id != keep_id:
            addr.is_default = False


async def create_address(db: AsyncSession, user_id: uuid.UUID, data: AddressRequest) -> Address:
    if data.is_default:
        await _unset_other_defaults(db, user_id)
    address = Address(user_id=user_id, **data.model_dump())
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return address


async def update_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID, data: UpdateAddressRequest) -> Address:
    address = await _get_owned(db, user_id, address_id)
    updates = data.model_dump(exclude_unset=True)
    if updates.get("is_default"):
        await _unset_other_defaults(db, user_id, keep_id=address_id)
    for key, value in updates.items():
        setattr(address, key, value)
    await db.commit()
    await db.refresh(address)
    return address


async def delete_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> None:
    address = await _get_owned(db, user_id, address_id)
    await db.delete(address)
    await db.commit()


async def set_default_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> Address:
    address = await _get_owned(db, user_id, address_id)
    await _unset_other_defaults(db, user_id, keep_id=address_id)
    address.is_default = True
    await db.commit()
    await db.refresh(address)
    return address
