from decimal import ROUND_HALF_UP, Decimal

CENTS = Decimal("0.01")


def round_money(value: Decimal) -> Decimal:
    """Round a Decimal amount to 2 decimal places using standard half-up rounding.

    Never use float for money (constitution §11 / spec.md FR-022) — callers must
    already be working in Decimal before this is called.
    """
    return value.quantize(CENTS, rounding=ROUND_HALF_UP)


def format_money(value: Decimal) -> str:
    return format(round_money(value), ".2f")


def to_decimal(value: str | int | float | Decimal) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))
