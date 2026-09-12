import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.notification import NotificationResponse
from app.services import notification_service

router = APIRouter(tags=["notifications"])


def _to_response(n) -> NotificationResponse:
    return NotificationResponse(
        id=str(n.id), event_type=n.event_type.value, payload=n.payload, created_at=n.created_at, delivered_at=n.delivered_at
    )


@router.get("/notifications", response_model=list[NotificationResponse])
async def list_notifications_route(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[NotificationResponse]:
    notifications = await notification_service.list_for_user(db, user.id)
    return [_to_response(n) for n in notifications]


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read_route(
    notification_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    await notification_service.mark_read(db, uuid.UUID(notification_id), user.id)
    return {"read": True}


@router.get("/admin/notifications", response_model=list[NotificationResponse])
async def list_admin_notifications_route(
    event_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[NotificationResponse]:
    notifications = await notification_service.list_for_admins(db, event_type)
    return [_to_response(n) for n in notifications]
