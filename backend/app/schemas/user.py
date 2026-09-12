import re

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import ORMModel

_PASSWORD_MIN_LENGTH = 8
_PASSWORD_MAX_BYTES = 72  # bcrypt's hard limit


def _validate_password_strength(password: str) -> str:
    if len(password) < _PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {_PASSWORD_MIN_LENGTH} characters long.")
    if len(password.encode("utf-8")) > _PASSWORD_MAX_BYTES:
        raise ValueError(f"Password must be at most {_PASSWORD_MAX_BYTES} bytes long.")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ValueError("Password must contain at least one letter and one digit.")
    return password


class RegisterRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)


class LoginRequest(ORMModel):
    email: EmailStr
    password: str


class TokenResponse(ORMModel):
    access_token: str
    token_type: str = "bearer"


class UserProfileResponse(ORMModel):
    id: str
    email: str
    name: str
    role: str
    preferred_currency: str


class UpdateProfileRequest(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    preferred_currency: str | None = None


class ChangePasswordRequest(ORMModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password_strength(value)
