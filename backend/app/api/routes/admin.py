from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.admin import AnalyticsResponse, DashboardSummaryResponse
from app.services import admin_service

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary_route(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> DashboardSummaryResponse:
    return await admin_service.get_dashboard_summary(db)


@router.get("/analytics", response_model=AnalyticsResponse)
async def dashboard_analytics_route(
    range: str,
    start: date | None = None,
    end: date | None = None,
    compare: str | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsResponse:
    return await admin_service.get_dashboard_analytics(db, range, start, end, compare)
