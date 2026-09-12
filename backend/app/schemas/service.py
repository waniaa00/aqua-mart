from datetime import date, time

from pydantic import Field

from app.schemas.common import Money, ORMModel


class ServiceResponse(ORMModel):
    id: str
    name: str
    description: str
    price: Money
    duration_minutes: int
    service_type: str
    is_active: bool
    image_url: str | None


class CreateServiceRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    base_price: str
    duration_minutes: int = Field(gt=0)
    service_type: str
    image_url: str | None = None


class UpdateServiceRequest(ORMModel):
    name: str | None = None
    description: str | None = None
    base_price: str | None = None
    duration_minutes: int | None = None
    is_active: bool | None = None
    image_url: str | None = None


class SlotResponse(ORMModel):
    id: str
    service_id: str
    date: date
    start_time: time
    capacity: int
    remaining_capacity: int
    is_blocked: bool


class CreateSlotRequest(ORMModel):
    date: date
    start_time: time
    capacity: int = Field(gt=0)


class UpdateSlotRequest(ORMModel):
    capacity: int | None = None
    is_blocked: bool | None = None


class CreateAppointmentRequest(ORMModel):
    service_id: str
    slot_id: str
    address_id: str | None = None
    notes: str | None = None


class AppointmentResponse(ORMModel):
    id: str
    service_id: str
    service_name: str
    slot_id: str
    date: date
    start_time: time
    status: str
    notes: str | None


class UpdateAppointmentStatusRequest(ORMModel):
    status: str


class RescheduleAppointmentRequest(ORMModel):
    new_slot_id: str
