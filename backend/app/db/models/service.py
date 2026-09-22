import enum
import uuid
from datetime import date as date_type, time as time_type

from sqlalchemy import Boolean, CheckConstraint, Date, Enum, ForeignKey, Integer, JSON, Numeric, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class Service(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "services"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    base_price: Mapped[object] = mapped_column(Numeric(12, 4), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    slots: Mapped[list["AppointmentSlot"]] = relationship(back_populates="service", cascade="all, delete-orphan")


class AppointmentSlot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "appointment_slots"
    __table_args__ = (CheckConstraint("booked_count >= 0 AND booked_count <= capacity", name="ck_slot_capacity"),)

    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time_type] = mapped_column(Time, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    booked_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    service: Mapped[Service] = relationship(back_populates="slots")

    @property
    def remaining_capacity(self) -> int:
        return self.capacity - self.booked_count


class Appointment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "appointments"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False)
    slot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("appointment_slots.id"), nullable=False, index=True)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"), default=AppointmentStatus.pending, nullable=False, index=True
    )
    address_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
