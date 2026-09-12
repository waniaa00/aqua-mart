from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import InvalidCurrencyError
from app.services import currency_service


def test_validate_currency_rejects_unsupported_code():
    with pytest.raises(InvalidCurrencyError):
        currency_service.validate_currency("XYZ")

    assert currency_service.validate_currency("GBP") == "GBP"


async def test_convert_same_currency_is_identity(db_session):
    money = await currency_service.convert(db_session, Decimal("42.00"), "USD", "USD")
    assert money.display_price == "42.00"
    assert money.exchange_rate == "1.0000"


async def test_get_rates_falls_back_when_provider_unreachable(db_session):
    with patch.object(currency_service, "_fetch_live_rates", new=AsyncMock(return_value=None)):
        response = await currency_service.get_rates(db_session, "USD")

    assert response.is_fallback is True
    assert response.rates["PKR"] == format(currency_service.FALLBACK_RATES["PKR"], ".4f")


async def test_get_rates_uses_live_data_when_available(db_session):
    fake_rates = {"USD": Decimal("1.0"), "GBP": Decimal("0.80"), "PKR": Decimal("300.0")}
    with patch.object(currency_service, "_fetch_live_rates", new=AsyncMock(return_value=fake_rates)):
        response = await currency_service.get_rates(db_session, "USD")

    assert response.is_fallback is False
    assert response.rates["GBP"] == "0.8000"
