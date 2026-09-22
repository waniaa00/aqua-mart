from app.schemas.common import ORMModel


class AddressRequest(ORMModel):
    full_name: str
    phone: str
    address_line: str
    city: str
    state_province: str | None = None
    postal_code: str
    country: str
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
    is_default: bool | None = None


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
