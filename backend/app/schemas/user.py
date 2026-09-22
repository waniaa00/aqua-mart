from pydantic import EmailStr, Field

from app.schemas.common import ORMModel


class RegisterRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(ORMModel):
    email: EmailStr
    password: str


class TokenResponse(ORMModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(ORMModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class UserProfileResponse(ORMModel):
    id: str
    email: str
    name: str
    role: str
    preferred_currency: str


class UpdateProfileRequest(ORMModel):
    name: str | None = None
    preferred_currency: str | None = None
