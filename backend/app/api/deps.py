import uuid

import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthenticatedError
from app.core.security import decode_access_token
from app.db.database import get_db
from app.db.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    if not token:
        raise UnauthenticatedError("Authentication is required.")
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise UnauthenticatedError("Invalid or expired token.")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthenticatedError("Invalid or expired token.")
    return user


async def get_optional_user(
    token: str | None = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User | None:
    if not token:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except UnauthenticatedError:
        return None


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise ForbiddenError("Admin access is required.")
    return user
