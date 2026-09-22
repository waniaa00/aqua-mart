from decimal import ROUND_HALF_UP, Decimal


def round_money(value: Decimal) -> Decimal:
    """Round to 2 decimal places using banker-safe half-up rounding — never
    use binary float for money (constitution FR-022)."""
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
