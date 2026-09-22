import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthenticatedError, ValidationAppError
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models.cart import Cart
from app.db.models.user import Currency, User, UserProfile, UserRole
from app.db.models.wishlist import Wishlist
from app.schemas.user import RegisterRequest, UserProfileResponse

SUPPORTED_CURRENCIES = {c.value for c in Currency}


def _to_profile_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        name=user.profile.full_name if user.profile else "",
        role=user.role.value,
        preferred_currency=user.preferred_currency.value,
    )


async def register_user(db: AsyncSession, data: RegisterRequest) -> UserProfileResponse:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("An account with this email already exists.", code="EMAIL_ALREADY_REGISTERED")

    user = User(email=data.email, password_hash=hash_password(data.password), role=UserRole.customer)
    db.add(user)
    await db.flush()

    profile = UserProfile(user_id=user.id, full_name=data.name)
    cart = Cart(user_id=user.id)
    wishlist = Wishlist(user_id=user.id)
    db.add_all([profile, cart, wishlist])
    await db.commit()

    user.profile = profile
    return _to_profile_response(user)


async def login_user(db: AsyncSession, email: str, password: str) -> str:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise UnauthenticatedError("Incorrect email or password.")
    return create_access_token(subject=str(user.id), role=user.role.value)


async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise ValidationAppError("Current password is incorrect.")
    user.password_hash = hash_password(new_password)
    await db.commit()


async def get_profile(db: AsyncSession, user: User) -> UserProfileResponse:
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    user.profile = result.scalar_one_or_none()
    return _to_profile_response(user)


async def update_profile(db: AsyncSession, user: User, name: str | None, preferred_currency: str | None) -> UserProfileResponse:
    if preferred_currency is not None:
        if preferred_currency not in SUPPORTED_CURRENCIES:
            raise ValidationAppError(f"Unsupported currency: {preferred_currency}")
        user.preferred_currency = Currency(preferred_currency)

    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if name is not None and profile is not None:
        profile.full_name = name
    user.profile = profile

    await db.commit()
    return _to_profile_response(user)
