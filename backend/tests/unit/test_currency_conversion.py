from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy import delete

from app.core.exceptions import ValidationAppError
from app.db.models.currency import CurrencyRate
from app.services import currency_service


async def _clear_cached_rate(db_session, currency: str) -> None:
    # Other tests in this session may have already cached a live rate for
    # this currency (session-scoped DB) — clear it so this test's mock is
    # actually exercised instead of hitting a fresh cache hit.
    await db_session.execute(delete(CurrencyRate).where(CurrencyRate.target_currency == currency))
    await db_session.commit()


def test_validate_currency_rejects_unsupported_code():
    with pytest.raises(ValidationAppError):
        currency_service.validate_currency("ZZZ")
    currency_service.validate_currency("GBP")  # does not raise


@pytest.mark.usefixtures("override_get_db")
async def test_convert_same_currency_is_identity(db_session):
    rate, is_fallback = await currency_service.get_rate(db_session, "USD")
    assert rate == Decimal("1.0000")
    assert is_fallback is False


@pytest.mark.usefixtures("override_get_db")
async def test_get_rates_falls_back_when_provider_unreachable(db_session):
    await _clear_cached_rate(db_session, "GBP")
    with patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=httpx.ConnectError("unreachable"))):
        rate, is_fallback = await currency_service.get_rate(db_session, "GBP")
    assert is_fallback is True
    assert rate == currency_service.FALLBACK_RATES["GBP"]


@pytest.mark.usefixtures("override_get_db")
async def test_get_rates_uses_live_data_when_available(db_session):
    await _clear_cached_rate(db_session, "PKR")
    mock_response = AsyncMock()
    mock_response.raise_for_status = lambda: None
    mock_response.json = lambda: {"rates": {"PKR": "285.1234"}}
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_response)):
        rate, is_fallback = await currency_service.get_rate(db_session, "PKR")
    assert is_fallback is False
    assert rate == Decimal("285.1234")
