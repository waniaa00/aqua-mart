import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.order import CreateOrderRequest, OrderResponse
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def checkout_route(
    data: CreateOrderRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> OrderResponse:
    return await order_service.checkout(db, user.id, uuid.UUID(data.address_id))


@router.get("", response_model=PaginatedResponse[OrderResponse])
async def list_orders_route(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[OrderResponse]:
    return await order_service.list_orders_for_user(db, user.id, page=page, limit=limit)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_route(
    order_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> OrderResponse:
    return await order_service.get_order_for_user(db, user.id, uuid.UUID(order_id))
