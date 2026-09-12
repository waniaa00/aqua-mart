import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthenticatedError, ValidationAppError
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models.user import SupportedCurrency, User, UserProfile
from app.schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UserProfileResponse,
)


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("An account with this email already exists.", code="EMAIL_ALREADY_REGISTERED")

    user = User(email=data.email, password_hash=hash_password(data.password))
    user.profile = UserProfile(full_name=data.name)
    db.add(user)
    await db.commit()
    # Not calling db.refresh(user) here: refresh() expires the whole instance,
    # and AsyncSession does not support the resulting implicit lazy-load of
    # user.profile outside a greenlet context. The in-memory object already
    # has everything to_profile_response() needs.
    return user


async def authenticate_user(db: AsyncSession, data: LoginRequest) -> str:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise UnauthenticatedError("Incorrect email or password.")
    if not user.is_active:
        raise UnauthenticatedError("Incorrect email or password.")
    return create_access_token(subject=user.id, role=user.role.value)


async def change_password(db: AsyncSession, user: User, data: ChangePasswordRequest) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise ValidationAppError("Current password is incorrect.")
    user.password_hash = hash_password(data.new_password)
    await db.commit()


def to_profile_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        name=user.profile.full_name if user.profile else "",
        role=user.role.value,
        preferred_currency=user.preferred_currency.value,
    )


async def get_profile(user: User) -> UserProfileResponse:
    return to_profile_response(user)


async def update_profile(db: AsyncSession, user: User, data: UpdateProfileRequest) -> UserProfileResponse:
    if data.name is not None and user.profile is not None:
        user.profile.full_name = data.name
    if data.preferred_currency is not None:
        try:
            user.preferred_currency = SupportedCurrency(data.preferred_currency)
        except ValueError as exc:
            raise ValidationAppError(f"Unsupported currency: {data.preferred_currency}") from exc
    await db.commit()
    return to_profile_response(user)
