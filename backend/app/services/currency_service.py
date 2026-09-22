from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ValidationAppError
from app.db.models.currency import CurrencyRate

SUPPORTED_CURRENCIES = {"USD", "GBP", "PKR"}
BASE_CURRENCY = "USD"

# Used only if the live provider is unreachable and no cached rate exists.
FALLBACK_RATES = {"GBP": Decimal("0.79"), "PKR": Decimal("280.50")}


def validate_currency(code: str) -> None:
    if code not in SUPPORTED_CURRENCIES:
        raise ValidationAppError(f"Unsupported currency: {code}", code="INVALID_CURRENCY")


async def _fetch_live_rate(target_currency: str) -> Decimal | None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(f"{settings.EXCHANGE_RATE_API_BASE}/latest/{BASE_CURRENCY}")
            response.raise_for_status()
            data = response.json()
            rate = data.get("rates", {}).get(target_currency)
            return Decimal(str(rate)) if rate is not None else None
    except (httpx.HTTPError, ValueError, KeyError):
        return None


async def get_rate(db: AsyncSession, target_currency: str) -> tuple[Decimal, bool]:
    """Returns (rate, is_fallback). USD→USD is always 1."""
    if target_currency == BASE_CURRENCY:
        return Decimal("1.0000"), False

    validate_currency(target_currency)

    cache_ttl = timedelta(hours=settings.EXCHANGE_RATE_CACHE_TTL_HOURS)
    result = await db.execute(
        select(CurrencyRate)
        .where(CurrencyRate.target_currency == target_currency, CurrencyRate.is_fallback.is_(False))
        .order_by(CurrencyRate.fetched_at.desc())
    )
    cached = result.scalars().first()
    now = datetime.now(timezone.utc)
    if cached is not None and (now - cached.fetched_at.replace(tzinfo=timezone.utc)) < cache_ttl:
        return Decimal(str(cached.rate)), False

    live_rate = await _fetch_live_rate(target_currency)
    if live_rate is not None:
        db.add(CurrencyRate(base_currency=BASE_CURRENCY, target_currency=target_currency, rate=live_rate, is_fallback=False))
        await db.commit()
        return live_rate, False

    if cached is not None:
        return Decimal(str(cached.rate)), False

    fallback_rate = FALLBACK_RATES[target_currency]
    db.add(CurrencyRate(base_currency=BASE_CURRENCY, target_currency=target_currency, rate=fallback_rate, is_fallback=True))
    await db.commit()
    return fallback_rate, True


async def get_all_rates(db: AsyncSession) -> tuple[dict[str, Decimal], bool]:
    rates = {"USD": Decimal("1.0000")}
    any_fallback = False
    for currency in SUPPORTED_CURRENCIES - {BASE_CURRENCY}:
        rate, is_fallback = await get_rate(db, currency)
        rates[currency] = rate
        any_fallback = any_fallback or is_fallback
    return rates, any_fallback
