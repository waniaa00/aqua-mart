from app.schemas.common import ORMModel


class CurrencyRatesResponse(ORMModel):
    base_currency: str
    rates: dict[str, str]
    is_fallback: bool
