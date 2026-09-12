from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    page: int
    limit: int
    total_items: int
    total_pages: int


class Money(BaseModel):
    base_price: str
    base_currency: str
    display_price: str
    display_currency: str
    exchange_rate: str

    @staticmethod
    def same_currency(amount: Decimal, currency: str) -> "Money":
        formatted = format(amount, ".2f")
        return Money(
            base_price=formatted,
            base_currency=currency,
            display_price=formatted,
            display_currency=currency,
            exchange_rate="1.0000",
        )
