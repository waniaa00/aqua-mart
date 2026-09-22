import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.notification import NotificationResponse
from app.services import notification_service

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications_route(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> PaginatedResponse[NotificationResponse]:
    return await notification_service.list_notifications_for_user(db, user.id, page, limit)


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read_route(
    notification_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    await notification_service.mark_read(db, user.id, uuid.UUID(notification_id))
    return {"read": True}


@router.get("/admin/notifications", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications_admin_route(
    event_type: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[NotificationResponse]:
    return await notification_service.list_notifications_admin(db, event_type, page, limit)
