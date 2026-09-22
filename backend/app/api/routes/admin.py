from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.admin import DashboardSummaryResponse
from app.services import admin_service

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary_route(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> DashboardSummaryResponse:
    return await admin_service.get_dashboard_summary(db)
