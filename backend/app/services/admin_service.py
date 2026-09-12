from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.product import Inventory, Product
from app.db.models.service import Appointment, AppointmentStatus
from app.db.models.user import User, UserRole
from app.schemas.admin import BestSellingProduct, DashboardSummaryResponse

_REVENUE_STATUSES = (
    OrderStatus.confirmed,
    OrderStatus.processing,
    OrderStatus.ready_for_delivery,
    OrderStatus.out_for_delivery,
    OrderStatus.completed,
)


async def get_dashboard_summary(db: AsyncSession) -> DashboardSummaryResponse:
    total_sales_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(Order.status.in_(_REVENUE_STATUSES))
    )
    total_sales = total_sales_result.scalar_one()

    total_orders = (await db.execute(select(func.count(Order.id)))).scalar_one()

    orders_by_status: dict[str, int] = {}
    for status_value in OrderStatus:
        count = (
            await db.execute(select(func.count(Order.id)).where(Order.status == status_value))
        ).scalar_one()
        orders_by_status[status_value.value] = count

    total_customers = (
        await db.execute(select(func.count(User.id)).where(User.role == UserRole.customer))
    ).scalar_one()
    total_products = (await db.execute(select(func.count(Product.id)))).scalar_one()

    low_stock_result = await db.execute(
        select(Product.id).join(Inventory, Inventory.product_id == Product.id).where(
            Inventory.stock_quantity <= Inventory.low_stock_threshold
        )
    )
    low_stock_products = [str(pid) for pid in low_stock_result.scalars().all()]

    total_appointments = (await db.execute(select(func.count(Appointment.id)))).scalar_one()

    appointments_by_status: dict[str, int] = {}
    for status_value in AppointmentStatus:
        count = (
            await db.execute(select(func.count(Appointment.id)).where(Appointment.status == status_value))
        ).scalar_one()
        appointments_by_status[status_value.value] = count

    best_selling_result = await db.execute(
        select(
            OrderItem.product_id,
            Product.name,
            func.sum(OrderItem.quantity).label("total_quantity"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(Order.status != OrderStatus.cancelled)
        .group_by(OrderItem.product_id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    best_selling_products = [
        BestSellingProduct(product_id=str(pid), name=name, total_quantity_sold=int(qty))
        for pid, name, qty in best_selling_result.all()
    ]

    recent_orders_result = await db.execute(select(Order.id).order_by(Order.placed_at.desc()).limit(5))
    recent_order_ids = [str(oid) for oid in recent_orders_result.scalars().all()]

    recent_appointments_result = await db.execute(select(Appointment.id).limit(5))
    recent_appointment_ids = [str(aid) for aid in recent_appointments_result.scalars().all()]

    return DashboardSummaryResponse(
        total_sales=str(total_sales),
        total_orders=total_orders,
        orders_by_status=orders_by_status,
        total_customers=total_customers,
        total_products=total_products,
        low_stock_products=low_stock_products,
        total_appointments=total_appointments,
        appointments_by_status=appointments_by_status,
        best_selling_products=best_selling_products,
        recent_order_ids=recent_order_ids,
        recent_appointment_ids=recent_appointment_ids,
    )
