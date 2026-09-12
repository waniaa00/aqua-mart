import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import InvalidCurrencyError
from app.db.models.currency import CurrencyRate
from app.schemas.common import Money
from app.schemas.currency import CurrencyRatesResponse
from app.utils.money import round_money

logger = logging.getLogger("app.currency")

# Used only when the external provider is unreachable and no cached rate exists.
FALLBACK_RATES: dict[str, Decimal] = {
    "USD": Decimal("1.0"),
    "GBP": Decimal("0.79"),
    "PKR": Decimal("280.50"),
}


def validate_currency(code: str) -> str:
    settings = get_settings()
    if code not in settings.SUPPORTED_CURRENCIES:
        raise InvalidCurrencyError(f"Unsupported currency: {code}")
    return code


async def _fetch_live_rates(base_currency: str) -> dict[str, Decimal] | None:
    settings = get_settings()
    url = f"{settings.EXCHANGE_RATE_API_BASE}/latest/{base_currency}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            rates = data.get("rates", {})
            return {code: Decimal(str(rates[code])) for code in FALLBACK_RATES if code in rates}
    except (httpx.HTTPError, ValueError, KeyError):
        logger.warning("Exchange-rate provider unavailable; falling back to cached/fallback rates.")
        return None


async def _get_cached_rate(db: AsyncSession, base_currency: str, target_currency: str) -> CurrencyRate | None:
    result = await db.execute(
        select(CurrencyRate).where(
            CurrencyRate.base_currency == base_currency, CurrencyRate.target_currency == target_currency
        )
    )
    return result.scalar_one_or_none()


async def get_rates(db: AsyncSession, base_currency: str = "USD") -> CurrencyRatesResponse:
    settings = get_settings()
    validate_currency(base_currency)

    existing = {}
    for code in settings.SUPPORTED_CURRENCIES:
        row = await _get_cached_rate(db, base_currency, code)
        if row is not None:
            existing[code] = row

    is_stale = any(
        code not in existing
        or existing[code].fetched_at < datetime.now(timezone.utc) - timedelta(hours=settings.EXCHANGE_RATE_CACHE_TTL_HOURS)
        for code in settings.SUPPORTED_CURRENCIES
    )

    is_fallback = False
    if is_stale:
        live_rates = await _fetch_live_rates(base_currency)
        if live_rates is not None:
            for code, rate in live_rates.items():
                row = existing.get(code)
                if row is None:
                    row = CurrencyRate(base_currency=base_currency, target_currency=code, rate=rate, is_fallback=False)
                    db.add(row)
                else:
                    row.rate = rate
                    row.is_fallback = False
                    row.fetched_at = datetime.now(timezone.utc)
                existing[code] = row
            await db.commit()
        elif not existing:
            # No cache and provider unreachable: serve the fallback table without persisting it
            # as if it were current, so a later successful fetch is not shadowed.
            is_fallback = True

    rates: dict[str, str] = {}
    for code in settings.SUPPORTED_CURRENCIES:
        if code in existing:
            rates[code] = format(existing[code].rate, ".4f")
        else:
            rates[code] = format(FALLBACK_RATES[code], ".4f")
            is_fallback = True

    return CurrencyRatesResponse(base_currency=base_currency, rates=rates, is_fallback=is_fallback)


async def convert(db: AsyncSession, amount: Decimal, from_currency: str, to_currency: str) -> Money:
    validate_currency(to_currency)
    if from_currency == to_currency:
        return Money.same_currency(amount, from_currency)

    rates_response = await get_rates(db, from_currency)
    rate = Decimal(rates_response.rates[to_currency])
    display_price = round_money(amount * rate)

    return Money(
        base_price=format(round_money(amount), ".2f"),
        base_currency=from_currency,
        display_price=format(display_price, ".2f"),
        display_currency=to_currency,
        exchange_rate=format(rate, ".4f"),
    )
