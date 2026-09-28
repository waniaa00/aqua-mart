import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.order import AdminOrderListItem, OrderResponse, UpdateOrderStatusRequest
from app.services import order_service

router = APIRouter(prefix="/admin/orders", tags=["admin-orders"])


@router.get("", response_model=PaginatedResponse[AdminOrderListItem])
async def list_orders_admin_route(
    status: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    customer_id: str | None = None,
    sort: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[AdminOrderListItem]:
    return await order_service.list_orders_admin(
        db,
        status,
        page,
        limit,
        search=search,
        date_from=date_from,
        date_to=date_to,
        customer_id=uuid.UUID(customer_id) if customer_id else None,
        sort=sort,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_admin_route(order_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> OrderResponse:
    return await order_service.get_order_admin(db, uuid.UUID(order_id))


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status_route(
    order_id: str, data: UpdateOrderStatusRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> OrderResponse:
    return await order_service.update_order_status(db, uuid.UUID(order_id), data.status)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order_admin_route(order_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> OrderResponse:
    return await order_service.cancel_order_admin(db, uuid.UUID(order_id))
