from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.services import auth_service
from app.schemas.user import ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponse, UserProfileResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def register_route(data: RegisterRequest, db: AsyncSession = Depends(get_db)) -> UserProfileResponse:
    return await auth_service.register_user(db, data)


@router.post("/login", response_model=TokenResponse)
async def login_route(data: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    token = await auth_service.login_user(db, data.email, data.password)
    return TokenResponse(access_token=token)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password_route(
    data: ChangePasswordRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    await auth_service.change_password(db, user, data.current_password, data.new_password)
