import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.db.models.address import Address
from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.product import Inventory, Product
from app.db.models.service import Appointment, AppointmentSlot, Service
from app.db.models.user import User, UserProfile, UserRole
from app.schemas.address import AddressResponse
from app.schemas.admin import (
    BestSellingProductResponse,
    CustomerDetailResponse,
    CustomerSummaryResponse,
    DashboardSummaryResponse,
    LowStockProductResponse,
)
from app.schemas.common import Money, PaginatedResponse
from app.schemas.service import AppointmentResponse
from app.services.order_service import order_to_response
from app.utils.pagination import clean_page_params, total_pages as compute_total_pages

REVENUE_STATUSES = [
    OrderStatus.confirmed, OrderStatus.processing, OrderStatus.ready_for_delivery,
    OrderStatus.out_for_delivery, OrderStatus.completed,
]


async def get_dashboard_summary(db: AsyncSession) -> DashboardSummaryResponse:
    # Five independent scalar aggregates combined into a single round trip
    # (each is its own uncorrelated subquery — Postgres runs a bare
    # `SELECT (subquery), (subquery), ...` with no FROM clause just fine).
    totals_query = select(
        select(func.count()).select_from(Order).scalar_subquery().label("total_orders"),
        select(func.coalesce(func.sum(Order.total), 0)).where(Order.status.in_(REVENUE_STATUSES)).scalar_subquery().label("total_sales"),
        select(func.count()).select_from(User).where(User.role == UserRole.customer).scalar_subquery().label("total_customers"),
        select(func.count()).select_from(Product).scalar_subquery().label("total_products"),
        select(func.count()).select_from(Appointment).scalar_subquery().label("total_appointments"),
    )
    total_orders, total_sales_raw, total_customers, total_products, total_appointments = (await db.execute(totals_query)).one()
    total_sales = Decimal(str(total_sales_raw))

    status_rows = await db.execute(select(Order.status, func.count()).group_by(Order.status))
    orders_by_status = {row[0].value: row[1] for row in status_rows.all()}

    low_stock_result = await db.execute(
        select(Product, Inventory)
        .join(Inventory, Inventory.product_id == Product.id)
        .where(Inventory.stock_quantity <= Inventory.low_stock_threshold)
    )
    low_stock_products = [
        LowStockProductResponse(id=str(p.id), name=p.name, stock_quantity=inv.stock_quantity, low_stock_threshold=inv.low_stock_threshold)
        for p, inv in low_stock_result.all()
    ]

    appt_status_rows = await db.execute(select(Appointment.status, func.count()).group_by(Appointment.status))
    appointments_by_status = {row[0].value: row[1] for row in appt_status_rows.all()}

    best_selling_result = await db.execute(
        select(OrderItem.product_id, Product.name, func.sum(OrderItem.quantity).label("qty"))
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(Order.status.in_(REVENUE_STATUSES))
        .group_by(OrderItem.product_id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
    )
    best_selling_products = [
        BestSellingProductResponse(id=str(row[0]), name=row[1], total_quantity_sold=row[2]) for row in best_selling_result.all()
    ]

    recent_orders_result = await db.execute(
        select(Order).options(selectinload(Order.items)).order_by(Order.placed_at.desc()).limit(5)
    )
    recent_orders = [await order_to_response(o, o.currency) for o in recent_orders_result.scalars().unique().all()]

    # One joined query instead of N+1 (appointment_to_response looks up
    # Service/AppointmentSlot per row, which is fine for a single appointment
    # but was compounding this endpoint's round-trip count considerably).
    recent_appointments_result = await db.execute(
        select(Appointment, Service.name, AppointmentSlot.date, AppointmentSlot.start_time)
        .join(Service, Service.id == Appointment.service_id)
        .join(AppointmentSlot, AppointmentSlot.id == Appointment.slot_id)
        .order_by(Appointment.created_at.desc())
        .limit(5)
    )
    recent_appointments = [
        AppointmentResponse(
            id=str(appt.id), service_id=str(appt.service_id), service_name=service_name,
            slot_id=str(appt.slot_id), date=slot_date, start_time=start_time,
            status=appt.status.value, notes=appt.notes,
        )
        for appt, service_name, slot_date, start_time in recent_appointments_result.all()
    ]

    return DashboardSummaryResponse(
        total_sales=Money.same_currency(total_sales, "USD"),
        total_orders=total_orders,
        orders_by_status=orders_by_status,
        total_customers=total_customers,
        total_products=total_products,
        low_stock_products=low_stock_products,
        total_appointments=total_appointments,
        appointments_by_status=appointments_by_status,
        best_selling_products=best_selling_products,
        recent_orders=recent_orders,
        recent_appointments=recent_appointments,
    )


# --- Customers ----------------------------------------------------------------


async def list_customers(db: AsyncSession, page: int, limit: int, search: str | None = None) -> PaginatedResponse[CustomerSummaryResponse]:
    # Pre-aggregate orders and appointments per user in their own subqueries
    # *before* joining to users — joining both raw tables directly to users
    # would multiply rows (an order x appointment cross-product per
    # customer) and silently inflate total_spent.
    orders_agg = (
        select(
            Order.user_id.label("user_id"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total).filter(Order.status.in_(REVENUE_STATUSES)), 0).label("total_spent"),
        )
        .group_by(Order.user_id)
        .subquery()
    )
    appts_agg = (
        select(Appointment.user_id.label("user_id"), func.count(Appointment.id).label("appt_count"))
        .group_by(Appointment.user_id)
        .subquery()
    )

    base_query = (
        select(
            User.id, UserProfile.full_name, User.email, User.preferred_currency, User.is_active, User.created_at,
            func.coalesce(orders_agg.c.order_count, 0), func.coalesce(orders_agg.c.total_spent, 0),
            func.coalesce(appts_agg.c.appt_count, 0),
        )
        .join(UserProfile, UserProfile.user_id == User.id)
        .outerjoin(orders_agg, orders_agg.c.user_id == User.id)
        .outerjoin(appts_agg, appts_agg.c.user_id == User.id)
        .where(User.role == UserRole.customer)
    )
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_

        base_query = base_query.where(or_(User.email.ilike(like), UserProfile.full_name.ilike(like)))

    params = clean_page_params(page, limit)
    total_items = (await db.execute(select(func.count()).select_from(base_query.with_only_columns(User.id).subquery()))).scalar_one()
    result = await db.execute(base_query.order_by(User.created_at.desc()).offset(params.offset).limit(params.limit))

    items = [
        CustomerSummaryResponse(
            id=str(uid), name=name, email=email, preferred_currency=currency.value, is_active=is_active,
            joined_at=created_at, total_orders=order_count, total_spent=Money.same_currency(Decimal(str(total_spent)), "USD"),
            total_appointments=appt_count,
        )
        for uid, name, email, currency, is_active, created_at, order_count, total_spent, appt_count in result.all()
    ]
    return PaginatedResponse(items=items, page=params.page, limit=params.limit, total_items=total_items, total_pages=compute_total_pages(total_items, params.limit))


async def get_customer_detail(db: AsyncSession, customer_id: uuid.UUID) -> CustomerDetailResponse:
    result = await db.execute(
        select(User).where(User.id == customer_id, User.role == UserRole.customer).options(selectinload(User.profile))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("Customer not found.")

    addresses_result = await db.execute(select(Address).where(Address.user_id == customer_id).order_by(Address.created_at))
    addresses = [AddressResponse.model_validate(a) for a in addresses_result.scalars().all()]

    orders_result = await db.execute(
        select(Order).where(Order.user_id == customer_id).options(selectinload(Order.items)).order_by(Order.placed_at.desc())
    )
    orders = [await order_to_response(o, o.currency) for o in orders_result.scalars().unique().all()]
    total_spent = sum((Decimal(o.total.display_price) for o in orders if o.status in {s.value for s in REVENUE_STATUSES}), Decimal("0"))

    appointments_result = await db.execute(
        select(Appointment, Service.name, AppointmentSlot.date, AppointmentSlot.start_time)
        .join(Service, Service.id == Appointment.service_id)
        .join(AppointmentSlot, AppointmentSlot.id == Appointment.slot_id)
        .where(Appointment.user_id == customer_id)
        .order_by(Appointment.created_at.desc())
    )
    appointments = [
        AppointmentResponse(
            id=str(appt.id), service_id=str(appt.service_id), service_name=service_name,
            slot_id=str(appt.slot_id), date=slot_date, start_time=start_time,
            status=appt.status.value, notes=appt.notes,
        )
        for appt, service_name, slot_date, start_time in appointments_result.all()
    ]

    return CustomerDetailResponse(
        id=str(user.id), name=user.profile.full_name if user.profile else "", email=user.email,
        preferred_currency=user.preferred_currency.value, is_active=user.is_active, joined_at=user.created_at,
        total_orders=len(orders), total_spent=Money.same_currency(total_spent, "USD"), total_appointments=len(appointments),
        phone=user.profile.phone if user.profile else None, addresses=addresses, orders=orders, appointments=appointments,
    )
