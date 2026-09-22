import uuid
from decimal import Decimal
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, field_validator

from app.utils.money import round_money

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("*", mode="before")
    @classmethod
    def _stringify_uuids(cls, value: Any) -> Any:
        # SQLAlchemy models expose UUID primary/foreign keys as `uuid.UUID`
        # objects; every schema in this app models those fields as `str`
        # (Pydantic v2 does not coerce UUID -> str automatically).
        return str(value) if isinstance(value, uuid.UUID) else value


class Money(ORMModel):
    base_price: str
    base_currency: str
    display_price: str
    display_currency: str
    exchange_rate: str

    @classmethod
    def same_currency(cls, amount: Decimal, currency: str) -> "Money":
        amount_str = str(round_money(amount))
        return cls(
            base_price=amount_str,
            base_currency=currency,
            display_price=amount_str,
            display_currency=currency,
            exchange_rate="1.0000",
        )

    @classmethod
    def converted(cls, amount: Decimal, base_currency: str, display_currency: str, rate: Decimal) -> "Money":
        converted_amount = round_money(amount * rate)
        return cls(
            base_price=str(round_money(amount)),
            base_currency=base_currency,
            display_price=str(converted_amount),
            display_currency=display_currency,
            exchange_rate=str(rate),
        )


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    page: int
    limit: int
    total_items: int
    total_pages: int
