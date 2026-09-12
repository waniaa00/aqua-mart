import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.address import AddressRequest, AddressResponse, UpdateAddressRequest
from app.schemas.user import UpdateProfileRequest, UserProfileResponse
from app.services import address_service, auth_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
async def read_profile(user: User = Depends(get_current_user)) -> UserProfileResponse:
    return await auth_service.get_profile(user)


@router.patch("/me", response_model=UserProfileResponse)
async def update_profile_route(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    return await auth_service.update_profile(db, user, data)


@router.get("/me/addresses", response_model=list[AddressResponse])
async def list_addresses_route(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[AddressResponse]:
    return await address_service.list_addresses(db, user.id)


@router.post("/me/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address_route(
    data: AddressRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AddressResponse:
    return await address_service.create_address(db, user.id, data)


@router.patch("/me/addresses/{address_id}", response_model=AddressResponse)
async def update_address_route(
    address_id: str,
    data: UpdateAddressRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddressResponse:
    return await address_service.update_address(db, user.id, uuid.UUID(address_id), data)


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address_route(
    address_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    await address_service.delete_address(db, user.id, uuid.UUID(address_id))


@router.post("/me/addresses/{address_id}/default", response_model=AddressResponse)
async def set_default_address_route(
    address_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AddressResponse:
    return await address_service.set_default(db, user.id, uuid.UUID(address_id))
