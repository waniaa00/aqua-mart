import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.admin import CustomerDetailResponse, CustomerSummaryResponse
from app.schemas.common import PaginatedResponse
from app.services import admin_service

router = APIRouter(prefix="/admin/customers", tags=["admin-customers"])


@router.get("", response_model=PaginatedResponse[CustomerSummaryResponse])
async def list_customers_route(
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CustomerSummaryResponse]:
    return await admin_service.list_customers(db, page, limit, search)


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
async def get_customer_detail_route(
    customer_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> CustomerDetailResponse:
    return await admin_service.get_customer_detail(db, uuid.UUID(customer_id))
