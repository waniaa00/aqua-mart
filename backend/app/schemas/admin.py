from app.schemas.common import ORMModel


class BestSellingProduct(ORMModel):
    product_id: str
    name: str
    total_quantity_sold: int


class DashboardSummaryResponse(ORMModel):
    total_sales: str
    total_orders: int
    orders_by_status: dict[str, int]
    total_customers: int
    total_products: int
    low_stock_products: list[str]
    total_appointments: int
    appointments_by_status: dict[str, int]
    best_selling_products: list[BestSellingProduct]
    recent_order_ids: list[str]
    recent_appointment_ids: list[str]
