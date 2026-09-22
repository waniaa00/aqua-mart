from datetime import datetime

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
