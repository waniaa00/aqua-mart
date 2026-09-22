from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.db.models.mixins import UUIDPrimaryKeyMixin


class CurrencyRate(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "currency_rates"

    base_currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    target_currency: Mapped[str] = mapped_column(String(3), nullable=False, index=True)
    rate: Mapped[object] = mapped_column(Numeric(12, 6), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
