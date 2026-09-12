from collections.abc import AsyncGenerator

import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenError, UnauthenticatedError
from app.core.security import decode_access_token
from app.db.database import get_db
from app.db.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if token is None:
        raise UnauthenticatedError("Authentication is required.")
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as exc:
        raise UnauthenticatedError("Invalid or expired authentication token.") from exc

    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthenticatedError("Invalid authentication token.")

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthenticatedError("Invalid authentication token.")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise ForbiddenError("This action requires administrator privileges.")
    return user


async def get_optional_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user, but returns None instead of raising for public
    routes that personalize behavior (e.g. default currency) when logged in."""
    if token is None:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except Exception:  # noqa: BLE001 — any auth failure on an optional route means "anonymous"
        return None
