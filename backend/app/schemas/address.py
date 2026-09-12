from pydantic import Field

from app.schemas.common import ORMModel


class AddressRequest(ORMModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=50)
    address_line: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=255)
    state_province: str | None = None
    postal_code: str = Field(min_length=1, max_length=50)
    country: str = Field(min_length=1, max_length=100)
    delivery_instructions: str | None = None
    is_default: bool = False


class UpdateAddressRequest(ORMModel):
    full_name: str | None = None
    phone: str | None = None
    address_line: str | None = None
    city: str | None = None
    state_province: str | None = None
    postal_code: str | None = None
    country: str | None = None
    delivery_instructions: str | None = None


class AddressResponse(ORMModel):
    id: str
    full_name: str
    phone: str
    address_line: str
    city: str
    state_province: str | None
    postal_code: str
    country: str
    delivery_instructions: str | None
    is_default: bool
