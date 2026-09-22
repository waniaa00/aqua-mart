import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.db.models.mixins import UUIDPrimaryKeyMixin


class NotificationEventType(str, enum.Enum):
    order_status_changed = "order_status_changed"
    appointment_confirmed = "appointment_confirmed"
    appointment_cancelled = "appointment_cancelled"
    appointment_reminder = "appointment_reminder"
    low_stock_alert = "low_stock_alert"


class Notification(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "notifications"

    recipient_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    event_type: Mapped[NotificationEventType] = mapped_column(
        Enum(NotificationEventType, name="notification_event_type"), nullable=False
    )
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
