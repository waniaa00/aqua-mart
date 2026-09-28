from datetime import date, datetime

from app.schemas.address import AddressResponse
from app.schemas.common import Money, ORMModel
from app.schemas.order import OrderResponse
from app.schemas.service import AppointmentResponse


class LowStockProductResponse(ORMModel):
    id: str
    name: str
    stock_quantity: int
    low_stock_threshold: int


class BestSellingProductResponse(ORMModel):
    id: str
    name: str
    total_quantity_sold: int


class DashboardSummaryResponse(ORMModel):
    total_sales: Money
    total_orders: int
    orders_by_status: dict[str, int]
    total_customers: int
    total_products: int
    low_stock_products: list[LowStockProductResponse]
    total_appointments: int
    appointments_by_status: dict[str, int]
    best_selling_products: list[BestSellingProductResponse]
    recent_orders: list[OrderResponse]
    recent_appointments: list[AppointmentResponse]


class CustomerSummaryResponse(ORMModel):
    id: str
    name: str
    email: str
    preferred_currency: str
    is_active: bool
    joined_at: datetime
    total_orders: int
    total_spent: Money
    total_appointments: int


class CustomerDetailResponse(CustomerSummaryResponse):
    phone: str | None
    addresses: list[AddressResponse]
    orders: list[OrderResponse]
    appointments: list[AppointmentResponse]


# --- Analytics (contracts/analytics.md) ----------------------------------
#
# Amounts here are plain USD decimal strings, not the `Money` shape — this
# endpoint (like the rest of admin reporting) never currency-converts, and
# the comparison math (absolute/percentage diffs) is simpler over bare
# decimals than over Money's base/display/exchange_rate triple.


class AnalyticsRange(ORMModel):
    start: date
    end: date


class AnalyticsSeriesPoint(ORMModel):
    date: date
    revenue: str
    order_count: int


class AnalyticsTotals(ORMModel):
    revenue: str
    order_count: int
    average_order_value: str


class AnalyticsComparison(ORMModel):
    previous_totals: AnalyticsTotals
    absolute_diff: AnalyticsTotals
    percentage_diff: dict[str, float]


class AnalyticsResponse(ORMModel):
    range: AnalyticsRange
    granularity: str
    series: list[AnalyticsSeriesPoint]
    totals: AnalyticsTotals
    comparison: AnalyticsComparison | None = None
